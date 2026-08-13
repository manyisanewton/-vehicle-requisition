// Client Script
// DocType: Vehicle Requisition

frappe.ui.form.on('Vehicle Requisition', {
    setup(frm) {
        // The server still rechecks availability. This filter is only UX.
        frm.set_query('vehicle', () => ({
            filters: {
                custom_booking_status: 'Available'
            }
        }));
    },

    async onload(frm) {
        if (frm.is_new()) {
            if (!frm.doc.date_borrowed) {
                await frm.set_value('date_borrowed', frappe.datetime.now_datetime());
            }

            await fetch_logged_in_user_details(frm);
        }

        // Fetch again when an existing active request is opened. This covers
        // requests created through imports/API and vehicles updated after the
        // draft was first opened.
        if (frm.doc.vehicle && ['Draft', 'To Amend', 'Pending Approval', 'Approved'].includes(frm.doc.workflow_state)) {
            await fetch_vehicle_odometer(frm, false);
        }
    },

    refresh(frm) {
        const returning = ['Approved', 'Returned'].includes(frm.doc.workflow_state);
        const return_required = frm.doc.workflow_state === 'Approved' ||
            (frm.doc.docstatus === 1 && frm.doc.workflow_state !== 'Returned');

        frm.toggle_display('return_section', returning);
        frm.toggle_display('fuel_section', returning);

        // Requested By is the logged-in ERPNext User. Department is derived
        // from that User's linked Employee record.
        frm.set_df_property('requested_by', 'read_only', 1);
        frm.set_df_property('department', 'read_only', 1);

        frm.set_df_property('actual_return_time', 'reqd', return_required);
        frm.set_df_property('actual_odometer_before_travel', 'reqd', return_required);
        frm.set_df_property('odometer_value_after_trip', 'reqd', return_required);

        if (frm.doc.workflow_state === 'Returned') {
            frm.disable_save();
        }
    },

    async vehicle(frm) {
        if (!frm.doc.vehicle) {
            await frm.set_value({
                last_odometer_value: 0,
                actual_odometer_before_travel: 0
            });
            calculate_mileage(frm);
            return;
        }
        await fetch_vehicle_odometer(frm, true);
    },

    actual_odometer_before_travel(frm) {
        calculate_mileage(frm);
    },

    odometer_value_after_trip(frm) {
        calculate_mileage(frm);
    },

    validate(frm) {
        if (frm.doc.return_by && frm.doc.date_borrowed &&
            frappe.datetime.get_diff(frm.doc.return_by, frm.doc.date_borrowed) < 0) {
            frappe.throw(__('Return By must be later than Date Borrowed.'));
        }

        if (frm.doc.odometer_value_after_trip != null &&
            flt(frm.doc.odometer_value_after_trip) < flt(frm.doc.actual_odometer_before_travel)) {
            frappe.throw(__('Odometer Value After Trip cannot be lower than Actual Odometer Before Travel.'));
        }
    }
});

function calculate_mileage(frm) {
    const before = flt(frm.doc.actual_odometer_before_travel);
    const after = flt(frm.doc.odometer_value_after_trip);
    const mileage = after >= before && after > 0 ? after - before : 0;
    frm.set_value('mileage', mileage);
}

async function fetch_vehicle_odometer(frm, reset_starting_odometer) {
    if (!frm.doc.vehicle) return;

    const result = await frappe.db.get_value(
        'Vehicle',
        frm.doc.vehicle,
        ['last_odometer', 'custom_booking_status', 'custom_active_requisition']
    );
    const vehicle = result && result.message;

    if (!vehicle) {
        frappe.throw(__('Could not read the selected Vehicle record.'));
    }

    const owns_booking = vehicle.custom_active_requisition === frm.doc.name;
    if (vehicle.custom_booking_status !== 'Available' && !owns_booking) {
        await frm.set_value('vehicle', null);
        frappe.throw(__('That vehicle is no longer available. Select another vehicle.'));
    }

    const last = flt(vehicle.last_odometer);
    const values = { last_odometer_value: last };

    // A new vehicle selection starts from the master odometer. Reopening a
    // request refreshes Last Odometer without erasing a confirmed start value.
    if (reset_starting_odometer || frm.doc.actual_odometer_before_travel == null) {
        values.actual_odometer_before_travel = last;
    }

    await frm.set_value(values);
    calculate_mileage(frm);
}

async function fetch_logged_in_user_details(frm) {
    const result = await frappe.db.get_value(
        'Employee',
        { user_id: frappe.session.user, status: 'Active' },
        ['department']
    );
    const employee = result && result.message;

    await frm.set_value({
        requested_by: frappe.session.user,
        department: employee ? (employee.department || null) : null
    });

    if (!employee) {
        frappe.msgprint(__(
            'Your User was filled automatically, but it is not connected to an active Employee record. Department could not be fetched. Ask HR to set {0} in Employee > User ID.',
            [frappe.session.user]
        ));
    } else if (!employee.department) {
        frappe.msgprint(__(
            'The Employee record connected to {0} has no Department.',
            [frappe.session.user]
        ));
    }
}
