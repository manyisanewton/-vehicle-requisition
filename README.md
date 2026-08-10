# Vehicle Requisition (ERPNext/Frappe)

This package describes a fresh, in-Desk implementation for company vehicle
booking. It deliberately does not depend on the old Vehicle Requisition,
Tracker, or Trip Records DocTypes.

The fresh DocType uses the name **Vehicle Requisition** (the old DocType was
deleted before this one took its name). The installation guide is in
[`docs/setup.md`](docs/setup.md). Paste the scripts from [`scripts/`](scripts/)
into the corresponding Client Script and Server Script records.

## Business rule

A vehicle can have only one active requisition. It is reserved when a request
enters **Pending Approval** and remains unavailable while **Approved**. It is
released only when the requisition becomes **Returned**, **Rejected**, or
**Cancelled**. There is no advance or time-slot booking.

The server performs the authoritative availability check with a database row
lock. The browser filter is only a convenience.




### App Versions
```
{
	"frappe": "16.27.1",
	"erpnext": "16.28.0",
	"hrms": "16.13.0",
	"frappe_whatsapp": "1.0.12",
	"frappe_mpsa_payments": "0.0.1",
	"taskist": "0.0.1",
	"telephony": "0.0.1",
	"helpdesk": "1.27.0",
	"changai": "0.0.1"
}
```
### Route
```
Form/Company Vehicle Requisition/CVR-2026-00001
```
### Traceback
```
Traceback (most recent call last):
  File "apps/frappe/frappe/app.py", line 121, in application
    response = frappe.api.handle(request)
  File "apps/frappe/frappe/api/__init__.py", line 63, in handle
    data = endpoint(**arguments)
  File "apps/frappe/frappe/api/v1.py", line 40, in handle_rpc_call
    return frappe.handler.handle()
           ~~~~~~~~~~~~~~~~~~~~~^^
  File "apps/frappe/frappe/handler.py", line 53, in handle
    data = execute_cmd(cmd)
  File "apps/frappe/frappe/handler.py", line 86, in execute_cmd
    return frappe.call(method, **frappe.form_dict)
           ~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "apps/frappe/frappe/__init__.py", line 1147, in call
    return fn(*args, **newargs)
  File "apps/frappe/frappe/utils/typing_validations.py", line 36, in wrapper
    return func(*args, **kwargs)
  File "apps/frappe/frappe/model/workflow.py", line 208, in apply_workflow
    doc.save()
    ~~~~~~~~^^
  File "apps/frappe/frappe/model/document.py", line 550, in save
    return self._save(*args, **kwargs)
           ~~~~~~~~~~^^^^^^^^^^^^^^^^^
  File "apps/frappe/frappe/model/document.py", line 587, in _save
    self.run_before_save_methods()
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~^^
  File "apps/frappe/frappe/model/document.py", line 1403, in run_before_save_methods
    self.run_method("validate")
    ~~~~~~~~~~~~~~~^^^^^^^^^^^^
  File "apps/frappe/frappe/model/document.py", line 1256, in run_method
    run_server_script_for_doc_event(self, method)
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^
  File "apps/frappe/frappe/core/doctype/server_script/server_script_utils.py", line 49, in run_server_script_for_doc_event
    frappe.get_cached_doc("Server Script", script_name).execute_doc(doc)
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^
  File "apps/frappe/frappe/core/doctype/server_script/server_script.py", line 196, in execute_doc
    safe_exec(
    ~~~~~~~~~^
    	self.script,
     ^^^^^^^^^^^^
    ...<2 lines>...
    	script_filename=self.name,
     ^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "apps/frappe/frappe/utils/safe_exec.py", line 126, in safe_exec
    exec(_compile_code(script, filename=filename), exec_globals, _locals)
    ~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "<serverscript>: company_vehicle_requisition	before_save", line 88, in <module>
  File "apps/frappe/frappe/utils/safe_exec.py", line 810, in _getattr_for_safe_exec
    _validate_attribute_read(object, name)
    ~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^
  File "apps/frappe/frappe/utils/safe_exec.py", line 829, in _validate_attribute_read
    raise SyntaxError(f"{name} is an unsafe attribute")
SyntaxError: format is an unsafe attribute

```
### Request Data
```
{
	"type": "POST",
	"args": {
		"doc": "{\"name\":\"CVR-2026-00001\",\"owner\":\"newton@vortexusindustrial.com\",\"creation\":\"2026-08-06 16:55:22.252181\",\"modified\":\"2026-08-06 16:55:22.252181\",\"modified_by\":\"newton@vortexusindustrial.com\",\"docstatus\":0,\"idx\":0,\"workflow_state\":\"Draft\",\"amended_from\":null,\"requested_by\":\"HR-EMP-00005\",\"department\":null,\"date_borrowed\":\"2026-08-06 16:54:49\",\"return_by\":\"2026-08-06 16:58:30\",\"location\":\"kenya\",\"vehicle\":\"KDM950X\",\"site_visit\":\"APMT-Adventist Development and Relief Agency-0087\",\"material_transfer\":null,\"project\":null,\"comment\":null,\"last_odometer_value\":0,\"actual_odometer_before_travel\":123,\"actual_return_time\":null,\"odometer_value_after_trip\":0,\"mileage\":0,\"fuel_quantity\":0,\"fuel_price\":0,\"fuel_station\":null,\"invoice_reference\":null,\"fuel_receipt\":null,\"decision_comment\":null,\"cancellation_reason\":null,\"doctype\":\"Company Vehicle Requisition\",\"__last_sync_on\":\"2026-08-06T13:55:22.388Z\"}",
		"action": "Send For Approval -  Manager"
	},
	"headers": {},
	"error_handlers": {},
	"url": "/api/method/frappe.model.workflow.apply_workflow",
	"request_id": "6fadb119-3b99-454b-bc9e-a66e9c682212"
}
```
### Response Data
```
{
	"exception": "SyntaxError: format is an unsafe attribute",
	"exc_type": "SyntaxError",
	"_exc_source": "Server Script"
}
```
