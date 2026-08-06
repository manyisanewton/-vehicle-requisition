# Server Script: Document Event / After Save
# Reference DocType: Company Vehicle Requisition

blocking_states = ("Pending Approval", "Approved")
release_states = ("Draft", "To Amend", "Returned", "Rejected", "Cancelled")

old_doc = doc.get_doc_before_save()
old_state = old_doc.workflow_state if old_doc else None
new_state = doc.workflow_state or "Draft"

if new_state in blocking_states:
    # Before Save has locked and validated this Vehicle row.
    frappe.db.set_value(
        "Vehicle",
        doc.vehicle,
        {
            "custom_booking_status": "Booked",
            "custom_active_requisition": doc.name
        },
        update_modified=False
    )

if new_state in release_states and old_state in blocking_states:
    active_request = frappe.db.get_value(
        "Vehicle", doc.vehicle, "custom_active_requisition"
    )

    # Never release a vehicle that an administrator has deliberately associated
    # with another request while repairing data.
    if active_request == doc.name:
        next_status = "Available"
        current_status = frappe.db.get_value(
            "Vehicle", doc.vehicle, "custom_booking_status"
        )
        if current_status == "Out of Service":
            next_status = "Out of Service"

        values = {
            "custom_booking_status": next_status,
            "custom_active_requisition": None
        }

        if new_state == "Returned":
            values["last_odometer"] = frappe.utils.flt(doc.odometer_value_after_trip)

        frappe.db.set_value(
            "Vehicle",
            doc.vehicle,
            values,
            update_modified=False
        )
