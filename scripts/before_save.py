# Server Script: Document Event / Before Save
# Reference DocType: Vehicle Requisition
#
# This is the authoritative validation. The SELECT ... FOR UPDATE serializes
# attempts to reserve the same Vehicle within Frappe's request transaction.

blocking_states = ("Pending Approval", "Approved")
terminal_states = ("Returned", "Rejected", "Cancelled")

old_doc = doc.get_doc_before_save()
old_state = old_doc.workflow_state if old_doc else None
old_vehicle = old_doc.vehicle if old_doc else None
new_state = doc.workflow_state or "Draft"

# Requested By stores a User, while Department is derived through Employee.user_id.
employee = frappe.db.get_value(
    "Employee",
    {"user_id": frappe.session.user, "status": "Active"},
    ["name", "department"],
    as_dict=True
)

privileged = bool(
    frappe.db.exists(
        "Has Role",
        {"parent": frappe.session.user, "role": ("in", ("Fleet Manager", "System Manager"))}
    )
)

if not privileged:
    # The server is authoritative: an ordinary requester cannot impersonate a
    # different ERPNext User, even through an API request.
    doc.requested_by = frappe.session.user
    doc.department = employee.department if employee else None
elif not doc.requested_by:
    doc.requested_by = frappe.session.user
    if employee:
        doc.department = employee.department

if not frappe.db.exists("User", doc.requested_by):
    frappe.throw("Requested By must be a valid ERPNext User.")

if not doc.vehicle:
    frappe.throw("Select a vehicle.")

if not doc.date_borrowed or not doc.return_by:
    frappe.throw("Date Borrowed and Return By are required.")

if frappe.utils.get_datetime(doc.return_by) <= frappe.utils.get_datetime(doc.date_borrowed):
    frappe.throw("Return By must be later than Date Borrowed.")

# This system has no advance booking. A small tolerance avoids clock/UI rounding issues.
if new_state == "Pending Approval":
    latest_allowed = frappe.utils.add_to_date(frappe.utils.now_datetime(), minutes=15)
    if frappe.utils.get_datetime(doc.date_borrowed) > latest_allowed:
        frappe.throw("Advance booking is not allowed. Date Borrowed must be the current time.")

if not (doc.site_visit or doc.material_transfer or doc.project or doc.comment):
    frappe.throw("Enter at least one purpose-of-trip detail.")

# Vehicle cannot be changed after it has been reserved.
if old_doc and old_state in blocking_states and old_vehicle != doc.vehicle:
    frappe.throw("The vehicle cannot be changed after the request has been reserved.")

# Lock the vehicle row whenever entering or remaining in an active state. A second
# transaction for the same vehicle waits, then sees the committed Booked state.
if new_state in blocking_states:
    rows = frappe.db.sql(
        """
        SELECT name, last_odometer, custom_booking_status, custom_active_requisition
        FROM `tabVehicle`
        WHERE name = %s
        FOR UPDATE
        """,
        (doc.vehicle,),
        as_dict=True
    )

    if not rows:
        frappe.throw("The selected vehicle does not exist.")

    vehicle_row = rows[0]
    active_request = vehicle_row.custom_active_requisition
    booking_status = vehicle_row.custom_booking_status or "Available"

    # Store the master odometer as the trip's starting reference. Do not rely on
    # the browser to supply this value.
    doc.last_odometer_value = frappe.utils.flt(vehicle_row.last_odometer)
    if doc.actual_odometer_before_travel is None:
        doc.actual_odometer_before_travel = doc.last_odometer_value

    if booking_status == "Out of Service":
        frappe.throw("The selected vehicle is Out of Service.")

    if booking_status != "Available" and active_request != doc.name:
        message = "Vehicle " + doc.vehicle + " is already booked"
        if active_request:
            message = message + " under requisition " + active_request
        frappe.throw(message + ". Select another vehicle.")

    # A second authoritative check protects data repaired/imported without the
    # Vehicle custom fields being synchronized.
    conflict = frappe.db.get_value(
        "Vehicle Requisition",
        {
            "vehicle": doc.vehicle,
            "workflow_state": ("in", blocking_states),
            "name": ("!=", doc.name)
        },
        "name"
    )
    if conflict:
        frappe.throw(
            "Vehicle " + doc.vehicle +
            " is already booked under requisition " + conflict +
            ". Select another vehicle."
        )

# Return fields are enforced on the server, not only by the workflow condition.
if new_state == "Returned":
    if old_state != "Approved":
        frappe.throw("Only an Approved requisition can be returned.")
    if not doc.actual_return_time:
        frappe.throw("Actual Return Time is required before returning the vehicle.")
    if doc.actual_odometer_before_travel is None:
        frappe.throw("Actual Odometer Before Travel is required.")
    if doc.odometer_value_after_trip is None:
        frappe.throw("Odometer Value After Trip is required.")

    # Fetch the authoritative value again at return. The Vehicle remains booked
    # by this requisition, so its last odometer should still be the dispatch value.
    vehicle_last_value = frappe.db.get_value("Vehicle", doc.vehicle, "last_odometer")
    doc.last_odometer_value = frappe.utils.flt(vehicle_last_value)

    before_value = frappe.utils.flt(doc.actual_odometer_before_travel)
    after_value = frappe.utils.flt(doc.odometer_value_after_trip)
    last_value = frappe.utils.flt(doc.last_odometer_value)

    if before_value < last_value:
        frappe.throw("Actual Odometer Before Travel cannot be lower than the vehicle's last odometer value.")
    if after_value < before_value:
        frappe.throw("Odometer Value After Trip cannot be lower than Actual Odometer Before Travel.")
    if frappe.utils.get_datetime(doc.actual_return_time) < frappe.utils.get_datetime(doc.date_borrowed):
        frappe.throw("Actual Return Time cannot be earlier than Date Borrowed.")

    doc.mileage = after_value - before_value

if new_state == "Rejected" and not doc.decision_comment:
    frappe.throw("Enter a Decision Comment before rejecting the request.")

if new_state == "Cancelled" and not doc.cancellation_reason:
    frappe.throw("Enter a Cancellation Reason before cancelling the booking.")
