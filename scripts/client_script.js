// Client Script
// DocType: Company Vehicle Requisition

frappe.ui.form.on('Company Vehicle Requisition', {
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

            // Connect each Employee to its ERPNext User through Employee.user_id.
            if (!frm.doc.requested_by && frappe.session.user !== 'Administrator') {
                const result = await frappe.db.get_value(
                    'Employee',
                    { user_id: frappe.session.user, status: 'Active' },
                    ['name', 'department']
                );

                if (result && result.message && result.message.name) {
                    await frm.set_value({
                        requested_by: result.message.name,
                        department: result.message.department || null
                    });
                } else {
                    frappe.msgprint(__('Your user account is not connected to an active Employee record. Contact HR or the System Manager.'));
                }
            }
        }
    },

    refresh(frm) {
        const returning = ['Approved', 'Returned'].includes(frm.doc.workflow_state);

        frm.toggle_display('return_section', returning);
        frm.toggle_display('fuel_section', returning);

        frm.set_df_property('actual_return_time', 'reqd', frm.doc.workflow_state === 'Approved');
        frm.set_df_property('actual_odometer_before_travel', 'reqd', frm.doc.workflow_state === 'Approved');
        frm.set_df_property('odometer_value_after_trip', 'reqd', frm.doc.workflow_state === 'Approved');

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

        const result = await frappe.db.get_value(
            'Vehicle',
            frm.doc.vehicle,
            ['last_odometer', 'custom_booking_status', 'custom_active_requisition']
        );
        const vehicle = result && result.message;

        if (!vehicle) return;

        if (vehicle.custom_booking_status !== 'Available' &&
            vehicle.custom_active_requisition !== frm.doc.name) {
            await frm.set_value('vehicle', null);
            frappe.throw(__('That vehicle is no longer available. Select another vehicle.'));
        }

        const last = flt(vehicle.last_odometer);
        await frm.set_value({
            last_odometer_value: last,
            actual_odometer_before_travel: last
        });
        calculate_mileage(frm);
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
