# `pnl_iot_assignment` 
This repository contains a stack implementation that utilizes AWS services to achieve event-based storage and processing for IoT devices. Specifically, it listens for events from IoT actions, stores records in a DynamoDB device_table, triggers a Lambda function, and sends messages through Amazon SNS when certain conditions are met.

Stack Components
DynamoDB Tables
device_table: This table stores records generated from IoT events. It is configured to trigger a Lambda function whenever new records are added.

vehicle_table: This table stores records generated from IoT events.

vehicle_device_mapping_table: This table maintains a mapping between handheld devices and vehicles, using MAC IDs as identifiers.

Lambda Function
The events-handler-lambda-function is triggered by records added to the device_table. It performs the following actions:

Extracts the MAC ID of the handheld device from the event record.
Retrieves the MAC ID of the associated vehicle from the vehicle_device_mapping_table.
Obtains the latitude and longitude of the vehicle_table.
Calculates the distance between the vehicle's location and handhelddevice location.
If the distance is greater than or equal to 50 meters, it sends a message using Amazon SNS.

### Repository Anatomy
```shell
tree -I 'node_modules|dist|cdk.out|coverage|*cache*|*egg-info' pnl_iot_assignment
pnl_iot_assignment
├───.husky
│   └───_
├───bin
├───lib
│   └───constructs
├───scripts
├───src
│   ├───lambda
│   │   └───__pycache__
│   └───lambda_layer
│       └───python
└───test
    ├───lambda
    │   ├───.pytest_cache
    │   │   └───v
    │   │       └───cache
    │   └───__pycache__
    ├───__pycache__
    └───__snapshots__

14 directories, 42 files
```

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npm run lint`    perform eslint on all .ts files
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template


#### 1．Configure your AWS CLI
```
https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html
```


#### 2．Select your aws profile
https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-profiles.html#cli-configure-profiles-create
```