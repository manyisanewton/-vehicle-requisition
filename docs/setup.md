# Setup guide

Perform this setup on a test site first. The names below are exact; changing a
fieldname requires changing it in the scripts too.

## 1. Roles

Create these roles if they do not already exist:

| Role | Purpose |
|---|---|
| Fleet User | Create and manage own requests |
| Fleet Approver | Approve, reject, or return requests for amendment |
| Fleet Manager | Administer the process and cancel an approved request |

## 2. Custom fields on Vehicle

Open **Customize Form > Vehicle** and add:

| Label | Fieldname | Type | Options/default | Properties |
|---|---|---|---|---|
| Booking Status | `custom_booking_status` | Select | `Available\nBooked\nOut of Service` | Default `Available`, read-only, in list view |
| Active Requisition | `custom_active_requisition` | Link | Company Vehicle Requisition | Read-only |

Set existing usable vehicles to `Available`. Set vehicles undergoing repair or
otherwise unavailable to `Out of Service`. Never let Fleet Users edit these two
fields.

## 3. New DocType

Create a new DocType named **Company Vehicle Requisition** in the module of your
choice.

Settings:

- Is Submittable: checked
- Track Changes: checked
- Title Field: `vehicle`
- Search Fields: `vehicle,requested_by,location`
- Naming: naming series
- Autoname/naming series: `CVR-.YYYY.-.#####`

Add the fields in this order. Section Break and Column Break rows are included
to make the form usable.

| Label | Fieldname | Type | Options | Important properties |
|---|---|---|---|---|
| Series | `naming_series` | Select | `CVR-.YYYY.-.#####` | Required, default first option |
| Workflow State | `workflow_state` | Select | `Draft\nTo Amend\nPending Approval\nApproved\nReturned\nRejected\nCancelled` | Read-only, no copy |
| Request Details | `request_details_section` | Section Break | | |
| Requested By | `requested_by` | Link | Employee | Required, read-only |
| Department | `department` | Link | Department | Read-only |
| Date Borrowed | `date_borrowed` | Datetime | | Required, default `Now` |
| Request Column | `request_column` | Column Break | | |
| Return By | `return_by` | Datetime | | Required |
| Location | `location` | Data | | Required |
| Vehicle | `vehicle` | Link | Vehicle | Required |
| Purpose of Trip | `purpose_section` | Section Break | | |
| Site Visit | `site_visit` | Link | Site | Optional; change `Site` only if your actual target DocType has another name |
| Material Transfer | `material_transfer` | Link | Stock Entry | Optional |
| Purpose Column | `purpose_column` | Column Break | | |
| Project | `project` | Link | Project | Optional |
| Comment | `comment` | Small Text | | Required |
| Dispatch and Return | `return_section` | Section Break | | Collapsible |
| Last Odometer Value | `last_odometer_value` | Float | | Read-only |
| Actual Odometer Before Travel | `actual_odometer_before_travel` | Float | | Allow on Submit |
| Return Column | `return_column` | Column Break | | |
| Actual Return Time | `actual_return_time` | Datetime | | Allow on Submit |
| Odometer Value After Trip | `odometer_value_after_trip` | Float | | Allow on Submit |
| Mileage | `mileage` | Float | | Read-only, allow on submit |
| Fuel Details | `fuel_section` | Section Break | | Collapsible |
| Fuel Quantity | `fuel_quantity` | Float | | Allow on Submit |
| Fuel Price | `fuel_price` | Currency | | Allow on Submit |
| Fuel Station | `fuel_station` | Data | | Allow on Submit |
| Fuel Column | `fuel_column` | Column Break | | |
| Invoice Reference | `invoice_reference` | Data | | Allow on Submit |
| Fuel Receipt | `fuel_receipt` | Attach | | Allow on Submit |
| Decision Details | `decision_section` | Section Break | | Collapsible |
| Decision Comment | `decision_comment` | Small Text | | Allow on Submit |
| Cancellation Reason | `cancellation_reason` | Small Text | | Allow on Submit |

If the **Site** DocType does not exist on the installation, use Data for
`site_visit`. `material_transfer` links to a submitted Stock Entry when the trip
is related to a material movement.

## 4. Permissions

Start with these DocType permissions and refine user permissions for your
organization:

| Role | Read | Create | Write | Submit | Cancel |
|---|---:|---:|---:|---:|---:|
| Fleet User | yes | yes | yes | no | no |
| Fleet Approver | yes | no | yes | yes | no |
| Fleet Manager | yes | yes | yes | yes | yes |

Use a User Permission or permission-query rule if Fleet Users must see only
their own requests. Workflow permissions control actions, while DocType
permissions control general access.

Assign both **Fleet Manager** and **Fleet User** to fleet managers. This lets a
manager enter the cancellation reason on an Approved document while the
workflow still restricts the Cancel Booking action to Fleet Manager.

## 5. Workflow

Create a Workflow named **Company Vehicle Requisition Workflow**:

- Document Type: Company Vehicle Requisition
- Active: checked
- Workflow State Field: `workflow_state`
- Do not enable "Don't Override Status"

### States

| State | Doc Status | Only Allow Edit For |
|---|---:|---|
| Draft | 0 | Fleet User |
| To Amend | 0 | Fleet User |
| Pending Approval | 0 | Fleet Approver |
| Approved | 1 | Fleet User |
| Returned | 1 | Fleet Manager |
| Rejected | 0 | Fleet Approver |
| Cancelled | 2 | Fleet Manager |

### Transitions

| Current state | Action | Next state | Allowed role | Condition |
|---|---|---|---|---|
| Draft | Send for Approval | Pending Approval | Fleet User | |
| To Amend | Resend for Approval | Pending Approval | Fleet User | |
| Pending Approval | Recall | Draft | Fleet User | |
| Pending Approval | Approve | Approved | Fleet Approver | |
| Pending Approval | Return for Amendment | To Amend | Fleet Approver | |
| Pending Approval | Reject | Rejected | Fleet Approver | `doc.decision_comment` |
| Approved | Return Vehicle | Returned | Fleet User | `doc.actual_return_time and doc.odometer_value_after_trip is not None` |
| Approved | Cancel Booking | Cancelled | Fleet Manager | `doc.cancellation_reason` |

Do not add a Cancel action from Returned. A completed trip is an audit record.

## 6. Scripts

Create one Client Script and two Document Event Server Scripts:

| File | Script record | Event |
|---|---|---|
| `scripts/client_script.js` | Client Script / Company Vehicle Requisition | Client form |
| `scripts/before_save.py` | Server Script / Company Vehicle Requisition | Before Save |
| `scripts/after_save.py` | Server Script / Company Vehicle Requisition | After Save |

Server Scripts are disabled by default on some Frappe v15 installations. They
must be enabled by the bench administrator. Public shared Frappe Cloud benches
may require a custom application instead.

## 7. Test checklist

Use two different employee accounts and complete all tests before production:

1. Both users open new requests and see the same available vehicle.
2. User A sends it for approval; the Vehicle becomes Booked.
3. User B tries to send their already-open draft for the same vehicle and is blocked.
4. The vehicle is absent from new Vehicle link searches.
5. Recall releases the vehicle.
6. Rejection releases the vehicle.
7. Approval keeps it booked.
8. Return is blocked without return time and valid ending odometer.
9. Return updates Vehicle.last_odometer and releases the vehicle.
10. Cancellation with a reason releases an approved vehicle.
11. A vehicle marked Out of Service cannot be reserved.
12. A non-Fleet Manager cannot change the vehicle after reservation.

Back up the site before rollout. Disable the old Workflow and scripts only after
these tests pass.
