# Tookan REST API — AI Coding Agent Implementation Guide

> Source: Official Tookan API blueprint (Apiary) — `https://tookanapi.docs.apiary.io/` (raw blueprint: `https://jsapi.apiary.io/apis/tookanapi.apib`).
> Note on source-fidelity: the user-described UI flow ("click the example code request block, pick the Body tab, set body type to raw") corresponds to the Postman public workspace `https://www.postman.com/simchef/tookan-public-api/overview`. That workspace renders as a JS-only shell and does not expose raw JSON examples to unauthenticated clients, so the raw-JSON request bodies below were lifted directly from the official Apiary blueprint that backs the same endpoints. If the named Postman workspace is the required source, treat this guide as **migrated/unavailable from Postman** and re-run with an authenticated Postman session.

## Conventions for the implementing agent

- **Base URL:** `https://api.tookanapp.com`
- **Method:** All endpoints are `POST` with `Content-Type: application/json`.
- **Auth:** Pass the API key via the `api_key` field inside the JSON body (no header auth). Generate it from Dashboard → Settings → API Keys.
- **Date format:** `YYYY-MM-DD HH:MM:SS`. Pass a `timezone` field as the offset from UTC in minutes (e.g. IST = `-330`, EST = `+300`).
- **Response shape:** `{ "status": <int>, "message": <string>, "data": <object> }`. `200` = success. Common errors: `100` PARAMETER_MISSING, `101` INVALID_KEY, `201` SHOW_ERROR_MESSAGE, `404` ERROR_IN_EXECUTION.
- **Task statuses (`job_status`):** `0` Assigned, `1` Started, `2` Successful, `3` Failed, `4` InProgress/Arrived, `6` Unassigned, `7` Acknowledged, `8` Declined, `9` Cancelled.
- **Implementation pattern (pseudocode):**

```python
import requests
def tookan_call(endpoint: str, payload: dict) -> dict:
    url = f"https://api.tookanapp.com/v2/{endpoint}"
    payload = {"api_key": API_KEY, **payload}
    r = requests.post(url, json=payload, timeout=30)
    r.raise_for_status()
    return r.json()
```

---

## Create Task

- **Endpoint:** `POST https://api.tookanapp.com/v2/create_task`

### Variant: Create a Pickup Task

This API is used to create a pickup task for merchant.

**Raw JSON request body (Body → raw → JSON):**

```json
{
    "api_key":"2b997be77e2cc22becfd4c66426ef504",
    "merchant_id":"356253",
    "order_id":"654321",
    "job_description":"groceries delivery",
    "job_pickup_phone":"+1201555555",
    "job_pickup_name":"7 Eleven Store",
    "job_pickup_email":"",
    "job_pickup_address":"114, sansome street, San Francisco",
    "job_pickup_latitude":"30.7188978",
    "job_pickup_longitude":"76.810296",
    "job_pickup_datetime":"2016-08-14 19:00:00",
    "pickup_custom_field_template":"Template_1",
    "pickup_meta_data": [{"label":"Price","data":"100"},{"label":"Quantity","data":"100"}],
    "team_id":"",
    "auto_assignment":"0",
    "has_pickup":"1",
    "has_delivery":"0",
    "layout_type":"0",
    "tracking_link":1,
    "timezone":"300",
    "fleet_id":"",
    "p_ref_images": ["http://tookanapp.com/wp-content/uploads/2015/11/logo_dark.png"],
    "notify":1,
    "tags":"",
    "geofence":0
}
```

### Variant: Create a Delivery Task

This API is used to create a Delivery Task for merchant.

**Raw JSON request body (Body → raw → JSON):**

```json
{
    "api_key":"2b997be77e2cc22becfd4c66426ef504",
    "merchant_id":"356253",
    "order_id":"654321",
    "job_description":"groceries delivery",
    "customer_email":"john@example.com",
    "customer_username":"John Doe",
    "customer_phone":"+12015555555",
    "customer_address":"frigate bay 2",
    "latitude":"30.7188978",
    "longitude":"76.810298",
    "job_delivery_datetime":"2016-08-14 21:00:00",
    "custom_field_template":"Template_1",
    "meta_data": [{"label":"Price","data":"100"},{"label":"Quantity","data":"100"}],
    "team_id":"",
    "auto_assignment":"0",
    "has_pickup":"0",
    "has_delivery":"1",
    "layout_type":"0",
    "tracking_link":1,
    "timezone":"-330",
    "fleet_id":"636",
    "ref_images": ["http://tookanapp.com/wp-content/uploads/2015/11/logo_dark.png","http://tookanapp.com/wp-content/uploads/2015/11/logo_dark.png"],
    "notify":1,
    "tags":"",
    "geofence":0
}
```

### Variant: Create a Pickup and Delivery Task

This api is used to create Pickup and Delivery task for merchant.

**Raw JSON request body (Body → raw → JSON):**

```json
{
    "api_key":"2b997be77e2cc22becfd4c66426ef504",
    "merchant_id":"356253",
    "order_id":"654321",
    "team_id":"",
    "auto_assignment":"0",
    "job_description":"groceries delivery",
    "job_pickup_phone":"+1201555555",
    "job_pickup_name":"7 Eleven Store",
    "job_pickup_email":"",
    "job_pickup_address":"frigate bay 1",
    "job_pickup_latitude":"30.7188978",
    "job_pickup_longitude":"76.810296",
    "job_pickup_datetime":"2016-08-14 19:00:00",
    "customer_email":"john@example.com",
    "customer_username":"John Doe",
    "customer_phone":"+12015555555",
    "customer_address":"frigate bay 2",
    "latitude":"30.7188978",
    "longitude":"76.810298",
    "job_delivery_datetime":"2016-08-14 21:00:00",
    "has_pickup":"1",
    "has_delivery":"1",
    "layout_type":"0",
    "tracking_link":1,
    "timezone":"-330",
    "custom_field_template":"Template_1",
    "meta_data": [{"label":"Price","data":"100"},{"label":"Quantity","data":"100"}],
    "pickup_custom_field_template":"Template_2",
    "pickup_meta_data": [{"label":"Price","data":"100"},{"label":"Quantity","data":"100"}],
    "fleet_id":"",
    "p_ref_images": ["http://tookanapp.com/wp-content/uploads/2015/11/logo_dark.png","http://tookanapp.com/wp-content/uploads/2015/11/logo_dark.png"],
    "ref_images": ["http://tookanapp.com/wp-content/uploads/2015/11/logo_dark.png","http://tookanapp.com/wp-content/uploads/2015/11/logo_dark.png"],
    "notify":1,
    "tags":"",
    "geofence":0,
    "ride_type":0
}
```

### Variant: Create an Appointment Task

This api is used to create an Appointment task for merchant.

**Raw JSON request body (Body → raw → JSON):**

```json
{
    "customer_email":"john@example.com",
    "merchant_id":"356253",
    "order_id":"654321",
    "customer_username":"John Doe",
    "customer_phone":"+919999999999",
    "customer_address":"Powai Lake, Powai, Mumbai, Maharashtra, India",
    "latitude":"28.5494489",
    "longitude":"77.2001368",
    "job_description":"Beauty services",
    "job_pickup_datetime":"2016-10-30 16:00:00",
    "job_delivery_datetime":"2016-10-30 17:00:00",
    "has_pickup":"0",
    "has_delivery":"0",
    "layout_type":"1",
    "tracking_link":1,
    "timezone":"-330",
    "custom_field_template":"Template_1",
    "meta_data": [{"label":"Price","data":"100"},{"label":"Quantity","data":"100"}],
    "api_key":"2b997be77e2cc22becfd4c66426ef504",
    "team_id":"",
    "auto_assignment":"0",
    "fleet_id":"",
    "ref_images": ["http://tookanapp.com/wp-content/uploads/2015/11/logo_dark.png","http://tookanapp.com/wp-content/uploads/2015/11/logo_dark.png"],
    "notify":1,
    "tags":"",
    "geofence":0
}
```

### Variant: Create a Field Workforce Task

This api is used to create a field workforce task.

**Raw JSON request body (Body → raw → JSON):**

```json
{
    "customer_email":"john@example.com",
    "order_id":"654321",
    "customer_username":"John Doe",
    "customer_phone":"+919999999999",
    "customer_address":"Powai Lake, Powai, Mumbai, Maharashtra, India",
    "latitude":"28.5494489",
    "longitude":"77.2001368",
    "job_description":"Beauty services",
    "job_pickup_datetime":"2016-10-30 16:00:00",
    "job_delivery_datetime":"2016-10-30 17:00:00",
    "has_pickup":"0",
    "has_delivery":"0",
    "layout_type":"2",
    "tracking_link":1,
    "timezone":"-330",
    "custom_field_template":"Template_1",
    "meta_data": [{"label":"Price","data":"100"},{"label":"Quantity","data":"100"}],
    "api_key":"2b997be77e2cc22becfd4c66426ef504",
    "team_id":"",
    "auto_assignment":"0",
    "fleet_id":"",
    "ref_images": ["http://tookanapp.com/wp-content/uploads/2015/11/logo_dark.png","http://tookanapp.com/wp-content/uploads/2015/11/logo_dark.png"],
    "notify":1,
    "tags":"",
    "geofence":0
}
```

---

## Create Multiple Tasks

- **Endpoint:** `POST https://api.tookanapp.com/v2/create_multiple_tasks`

### Variant: Create Multiple Pickup And Delivery Tasks

This API is used to create multiple pickup and delivery merchant tasks for the fleets at once.

**Raw JSON request body (Body → raw → JSON):**

```json
{
  "api_key": "c3e46bc0bbdc2d6cdf22f4dae426581259435bd522fd98b30f5baf939b9ce2ba",
  "merchant_id": "452362",
  "fleet_id": 19750,
  "timezone": -330,
  "has_pickup": 1,
  "has_delivery": 1,
  "layout_type": 0,
  "geofence": 0,
  "auto_assignment": 0,
  "tags": "",
  "pickups": [{
"address": "Chandigarh International Airport, Sahibzada Ajit Singh Nagar, Punjab, India",
"latitude": 30.7333148,
"longitude": 76.7794179,
"time": "2017-08-14 17:24:00",
"phone": "+911234567890",
"template_name": "Template_1",
"template_data": [{
    "label": "Price",
    "data": "100"
 }, {
    "label": "Quantity",
    "data": "100"
}],
"ref_images": ["http://tookanapp.com/wp-content/uploads/2015/11/logo_dark.png"],
"name": "Saurabh",
"email": "saurabh@saurabh.com",
"order_id": "12234556",
"job_description": "Job description goes here"
  }],
  "deliveries": [{
"address": "Chandigarh Railway Station, Daria, Chandigarh, India",
"latitude": 30.7022191,
"longitude": 76.82247009999992,
"time": "2017-08-14 17:30:00",
"phone": "+913242342342",
"template_name": "Template_1",
"template_data": [
{
  "label": "Price",
  "data": "100"
},
{
  "label": "Quantity",
  "data": "100"
}
],
"ref_images": ["http://tookanapp.com/wp-content/uploads/2015/11/logo_dark.png"],
"name": "Saurabh",
"email": "saurabh@saurabh.com",
"order_id": "123456",
"job_description": "Job description goes here"
  }]
}
```

### Variant: Create Multiple Pickup Tasks

This API is used to create multiple pickup merchant tasks for the fleets at once.

**Raw JSON request body (Body → raw → JSON):**

```json
{
  "api_key": "c3e46bc0bbdc2d6cdf22f4dae426581259435bd522fd98b30f5baf939b9ce2ba",
  "merchant_id": "452362",
  "fleet_id": 19750,
  "timezone": -330,
  "has_pickup": 1,
  "has_delivery": 1,
  "layout_type": 0,
  "geofence": 0,
  "auto_assignment": 0,
  "tags": "",
  "pickups": [{
"address": "Chandigarh International Airport, Sahibzada Ajit Singh Nagar, Punjab, India",
"latitude": 30.7333148,
"longitude": 76.7794179,
"time": "2017-08-14 17:24:00",
"phone": "+911234567890",
"template_name": "Template_1",
"template_data": [{
    "label": "Price",
    "data": "100"
 }, {
    "label": "Quantity",
    "data": "100"
}],
"ref_images": ["http://tookanapp.com/wp-content/uploads/2015/11/logo_dark.png"],
"name": "Saurabh",
"email": "saurabh@saurabh.com",
"order_id": "12234556",
"job_description": "Job description goes here"
  }],
  "deliveries": [{
"address": "Chandigarh Railway Station, Daria, Chandigarh, India",
"latitude": 30.7022191,
"longitude": 76.82247009999992,
"time": "2017-08-14 17:30:00",
"phone": "+913242342342",
"template_name": "Template_1",
"template_data": [
{
  "label": "Price",
  "data": "100"
},
{
  "label": "Quantity",
  "data": "100"
}
],
"ref_images": ["http://tookanapp.com/wp-content/uploads/2015/11/logo_dark.png"],
"name": "Saurabh",
"email": "saurabh@saurabh.com",
"order_id": "123456",
"job_description": "Job description goes here"
  }]
}
```

### Variant: Create Multiple Delivery Tasks

This API is used to create multiple delivery merchant tasks for the fleets at once.

**Raw JSON request body (Body → raw → JSON):**

```json
{
  "api_key": "c3e46bc0bbdc2d6cdf22f4dae426581259435bd522fd98b30f5baf939b9ce2ba",
  "merchant_id": "452362",
  "fleet_id": 19750,
  "timezone": -330,
  "has_pickup": 1,
  "has_delivery": 1,
  "layout_type": 0,
  "geofence": 0,
  "auto_assignment": 0,
  "tags": "",
  "pickups": [{
"address": "Chandigarh International Airport, Sahibzada Ajit Singh Nagar, Punjab, India",
"latitude": 30.7333148,
"longitude": 76.7794179,
"time": "2017-08-14 17:24:00",
"phone": "+911234567890",
"template_name": "Template_1",
"template_data": [{
    "label": "Price",
    "data": "100"
 }, {
    "label": "Quantity",
    "data": "100"
}],
"ref_images": ["http://tookanapp.com/wp-content/uploads/2015/11/logo_dark.png"],
"name": "Saurabh",
"email": "saurabh@saurabh.com",
"order_id": "12234556",
"job_description": "Job description goes here"
  }],
  "deliveries": [{
"address": "Chandigarh Railway Station, Daria, Chandigarh, India",
"latitude": 30.7022191,
"longitude": 76.82247009999992,
"time": "2017-08-14 17:30:00",
"phone": "+913242342342",
"template_name": "Template_1",
"template_data": [
{
  "label": "Price",
  "data": "100"
},
{
  "label": "Quantity",
  "data": "100"
}
],
"ref_images": ["http://tookanapp.com/wp-content/uploads/2015/11/logo_dark.png"],
"name": "Saurabh",
"email": "saurabh@saurabh.com",
"order_id": "123456",
"job_description": "Job description goes here"
  }]
}
```

---

## Get All Tasks

- **Endpoint:** `POST https://api.tookanapp.com/v2/get_all_tasks`

This API is used to get all the tasks as per the filters. Start Date and End Date range refer to Task Date. The start and End Date shall have to be inside the 31 days span. By utilizing this API, you can retrieve task details for a maximum span of 31 days from the current date.

**Raw JSON request body (Body → raw → JSON):**

```json
{
  "api_key": "00be7353ba73d5cb9812b9b9af404f8b",
  "job_status": "1",
  "job_type": 1,
  "start_date": "2016-08-20",
  "end_date": "2016-08-20",
  "custom_fields": 0,
  "is_pagination":1,
  "requested_page":1,
  "customer_id":"",
  "fleet_id": 1234,
  "job_id": [123, 456, 789],
  "order_id": ["123", "Y-456", "O_789"],
  "team_id":123
}
```

---

## Get Task Details

- **Endpoint:** `POST https://api.tookanapp.com/v2/get_job_details`

This api is used to get the details of the task.

**Raw JSON request body (Body → raw → JSON):**

```json
{
    "api_key":"2b997be77e2cc22becfd4c66426ef504",
    "job_ids":[5145, 1234],
    "include_task_history": 0,
    "job_additional_info" : 1,
    "include_job_report" : 0
}
```

---

## Get Task Details by Order ID

- **Endpoint:** `POST https://api.tookanapp.com/v2/get_job_details_by_order_id`

This api is used to get the details of the task.

**Raw JSON request body (Body → raw → JSON):**

```json
{
    "api_key":"7fed9dc6f41eb088bb49ab5344685d13",
    "order_ids":["P000469","123"],
    "include_task_history": 0
}
```

---

## Edit Task

- **Endpoint:** `POST https://api.tookanapp.com/v2/edit_task`

This api used to edit a task that has already been added.

**Raw JSON request body (Body → raw → JSON):**

```json
{
    "customer_email":"john@example.com",
    "customer_username":"John Doe",
    "customer_phone":"+919999999999",
    "customer_address":"Powai Lake, Powai, Mumbai, Maharashtra, India",
    "latitude":"28.5494489",
    "longitude":"77.2001368",
    "job_description":"Beauty services",
    "job_pickup_datetime":"2016-09-30 16:00:00",
    "job_delivery_datetime":"2016-09-30 17:00:00",
    "has_pickup":"0",
    "has_delivery":"0",
    "layout_type":"1",
    "tracking_link":1,
    "timezone":"-330",
    "api_key":"2b997be77e2cc22becfd4c66426ef504",
    "job_id":2952,
    "notify": 1
}
```

---

## Edit Multiple Tasks

- **Endpoint:** `POST https://api.tookanapp.com/v2/edit_multiple_tasks`

This API is used to edit multiple tasks that are already added. It takes as input the array of pickup and delivery tasks and one by one updates their data. Request Parameters:

**Raw JSON request body (Body → raw → JSON):**

```json
{
"api_key":"7fed9dc6f41eb088bb49ab5344685d13",
"pickups":[{
            "job_id":"123344",
            "address": "Chandigarh International Airport, Sahibzada Ajit Singh Nagar, Punjab, India",
            "latitude": 30.7333148,
            "longitude": 76.7794179,
            "time": "2017-08-14 17:24:00",
            "phone": "+911234567890"
            }],
"deliveries":[{
            "job_id":"123345",
            "address": "Chandigarh Railway Station, Daria, Chandigarh, India",
            "latitude": 30.7022191,
            "longitude": 76.82247009999992,
            "time": "2017-08-14 17:30:00",
            "phone": "+913242342342"
            }]
}
```

---

## Delete Task

- **Endpoint:** `POST https://api.tookanapp.com/v2/delete_task`

This API is used to Delete a task which is not necessary.

**Raw JSON request body (Body → raw → JSON):**

```json
{
    "api_key": "2b997be77e2cc22becfd4c66426ef504",
    "job_id": "2755"
}
```

---

## Update Task Status

- **Endpoint:** `POST https://api.tookanapp.com/v2/update_task_status`

This API is used to force update the status of a task.

**Raw JSON request body (Body → raw → JSON):**

```json
{
    "api_key": "2b997be77e2cc22becfd4c66426ef504",
    "job_id": "5145",
    "job_status": "2"
}
```

---

## Assign Task

- **Endpoint:** `POST https://api.tookanapp.com/v2/assign_task`

This API is used to assign/reassign a unassigned/assigned task or an assigned task to Agent.

**Raw JSON request body (Body → raw → JSON):**

```json
{
    "api_key": "2b997be77e2cc22becfd4c66426ef504",
    "job_id": "5145",
    "fleet_id": "",
    "team_id":"",
    "job_status": "2"
}
```

---

## Reassign Multiple Tasks (Open Tasks)

- **Endpoint:** `POST https://api.tookanapp.com/v2/reassign_open_tasks`

This API is used to reassign multiple tasks to agent.

**Raw JSON request body (Body → raw → JSON):**

```json
{
"api_key":"25def1849131c152c3017162c431fe4c4fe2c",
"user_id": 12345,
"team_id": 123,
"fleet_id": 123456,
"job_ids":[123,1234,12345,123456]
}
```

---

## Auto-assign Task

- **Endpoint:** `POST https://api.tookanapp.com/v2/re_autoassign_task`

This API is used to auto-assign an unassigned/assigned task. Only tasks that have <code>auto_assignment</code> enabled will be auto-assigned through this API.

**Raw JSON request body (Body → raw → JSON):**

```json
{
"api_key":"2b997be77e2cc22becfd4c66426ef504",
"job_id":"5145"
}
```

---

## Assign Agent to Task

- **Endpoint:** `POST https://api.tookanapp.com/v2/assign_fleet_to_task`

This API is used to assign a merchant's agent to your task.

**Raw JSON request body (Body → raw → JSON):**

```json
{
"api_key":"55631.076225def01849131c152c3017162c431fe4c4fe2c",
 "merchant_id":73533,
"job_id":20813248,
"team_id":72193,
"fleet_id":165932,
"notify":1,
"geofence":0,
"job_status":"0"
}
```

---

## Assign Agent to Related Tasks

- **Endpoint:** `POST https://api.tookanapp.com/v2/assign_fleet_to_related_tasks`

This API is used to assign an agent to related task.

**Raw JSON request body (Body → raw → JSON):**

```json
{
"api_key":"55631.076225def1849131c152c3017162c431fe4c4fe2c",
"pickup_delivery_relationship": "230604115408992882073152"
"team_id":72193,
"fleet_id":165932,
"notify":1,
"geofence":0,
"job_status":"0"
}
```

---

## Add Agent

- **Endpoint:** `POST https://api.tookanapp.com/v2/add_agent`

This API is used to register a new Agent in your account.

**Raw JSON request body (Body → raw → JSON):**

```json
{
  "api_key": "1fc5defefb668fcf820bac29e7b7aa05",
  "email": "abc@xyz.com",
  "phone": "919999999999",
  "transport_type": "1",
  "transport_desc": "auto",
  "license": "demo",
  "color": "blue",
  "timezone": "-330",
  "team_id": "Your Team ID",
  "password": "abcdefg",
  "username": "username",
  "first_name": "Decimate",
  "last_name": "abc",
  "rule_id":123,
  "merchant_id":1234
}
```

---

## Get All Agents (Fleets)

- **Endpoint:** `POST https://api.tookanapp.com/v2/get_all_fleets`

This API is used to get all the Agents/drivers/fleets information with respect to a location. The response array contains a status key for each of the fleet, which shows the current status of the fleet - 0 for available, 1 for offline and 2 for busy, taking into account the location, connectivity, ON-Duty/OFF-Duty status and if they are presently working a task.

**Raw JSON request body (Body → raw → JSON):**

```json
{
"api_key": "2b997be77e2becfd4c66426ef504",
"tags": "mini,suv",
"name": "manish",
"fleet_ids": [49322, 42947],
"include_any_tag": 1,
"status": 0,
"fleet_type": 1,
"merchant_id":1234
}
```

---

## Edit Agent

- **Endpoint:** `POST https://api.tookanapp.com/v2/edit_agent`

This API is used to update particular agent of your account.

**Raw JSON request body (Body → raw → JSON):**

```json
{
  "api_key": "1fc5defefb668fcf820bac29e7b7aa05",
  "fleet_id": "12",
  "email": "abc@xyz.com",
  "phone": "919999999999",
  "transport_type": "1",
  "transport_desc": "auto",
  "license": "demo",
  "color": "blue",
  "timezone": "-330",
  "team_id": "1",
  "password": "abcdefg",
  "first_name": "Decimate",
  "last_name": "abc",
  "rule_id":123,
  "merchant_id":12345
}
```

---

## Delete Agent Account

- **Endpoint:** `POST https://api.tookanapp.com/v2/delete_fleet_account`

This API is used to delete the Agent in your account.

**Raw JSON request body (Body → raw → JSON):**

```json
{
  "api_key": "1fc5defefb668fcf820bac29e7b7aa05",
  "fleet_id": "49644"
}
```

---

## Block/Unblock Agent

- **Endpoint:** `POST https://api.tookanapp.com/v2/block_and_unblock_agent`

This API is used to block/unblock the Agent in your account.

**Raw JSON request body (Body → raw → JSON):**

```json
{
  "api_key": "1fc5defefb668fcf820bac29e7b7aa05",
  "fleet_id": "60048,60047",
  "block_status":0,
  "block_reason":"agent not available for some time sapin",
  "unblock_on_date" : "2020-09-28"
}
```

---

## Create Team

- **Endpoint:** `POST https://api.tookanapp.com/v2/create_team`

This API is used to create a team Body Parameters:

**Raw JSON request body (Body → raw → JSON):**

```json
{
    "api_key": "7eeca84b5e1df27d15f8422949314db6",
    "team_name":"Test Team",
    "battery_usage":0,
    "address":"Chandigarh, India",
    "tags":"tag1,tag2"
}
```

---

## Get All Teams

- **Endpoint:** `POST https://api.tookanapp.com/v2/view_all_team_only`

This API is used to get the all teams details without their agent's data.

**Raw JSON request body (Body → raw → JSON):**

```json
{
    "api_key": "7eeca84b5e1df27d15f8422949314db6"
}
```

---

## Implementation checklist for the AI coding agent

1. Create a thin `TookanClient` wrapper that injects `api_key` and posts JSON to `https://api.tookanapp.com/v2/<endpoint>`.
2. For each endpoint above, expose a typed method named after the URL slug (e.g. `create_task`, `get_all_tasks`, `assign_fleet_to_task`).
3. Validate that `*`-marked parameters are present before sending; raise on `status != 200`.
4. For multi-variant endpoints (`Create Task`, `Create Multiple Tasks`), branch on `layout_type` / `has_pickup` / `has_delivery` to pick the right payload shape shown above.
5. Persist `job_id`, `job_hash`, and `tracking_link` from successful task-create responses for downstream operations.
6. Add retry-with-backoff on HTTP 5xx; surface Tookan business errors (`100`, `101`, `201`, `404`) as typed exceptions.