# Company Vehicle Requisition (ERPNext/Frappe)

This package describes a fresh, in-Desk implementation for company vehicle
booking. It deliberately does not depend on the old Vehicle Requisition,
Tracker, or Trip Records DocTypes.

The installation guide and exact DocType/workflow configuration are in
[`docs/setup.md`](docs/setup.md). Paste the scripts from [`scripts/`](scripts/)
into the corresponding Client Script and Server Script records.

## Business rule

A vehicle can have only one active requisition. It is reserved when a request
enters **Pending Approval** and remains unavailable while **Approved**. It is
released only when the requisition becomes **Returned**, **Rejected**, or
**Cancelled**. There is no advance or time-slot booking.

The server performs the authoritative availability check with a database row
lock. The browser filter is only a convenience.
