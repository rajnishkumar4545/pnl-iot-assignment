import * as cdk from 'aws-cdk-lib';
import { Capture, Match, Template } from 'aws-cdk-lib/assertions';
import { PnlIotAssignmentStack } from '../lib/pnl_iot_assignment-stack';
import * as context from '../bin/context';

/*
** Environment variables
*/
const environment = 'dev';
const envContext = context[environment];

describe('pnl assessment stack tests', () => {
    test('Should generate stack as expected by snapshot', () => {
    const app = new cdk.App();
      const stack = new PnlIotAssignmentStack(app, 'CdkDemoProjectStack', {
        referenceTableName: envContext.referenceTableName,
    referenceTablePartitionkey: envContext.referenceTablePartitionkey,
    vehicleTableName: envContext.vehicleTableName,
    vehicleTablePartitionKey: envContext.vehicleTablePartitionKey,
    deviceTableName: envContext.deviceTableName,
    deviceTablePartitionKey: envContext.deviceTablePartitionKey,
    lambdaLayerName: envContext.lambdaLayerName,
    lambdaFunctionName: envContext.lambdaFunctionName,
    lambdaAliasName: envContext.lambdaAliasName,
    snsTopicArn: envContext.snsTopicArn,
      });
      const template = Template.fromStack(stack);

      // Check for Lambda Property
      template.hasResourceProperties("AWS::Lambda::Function", {
        Handler: "iot_events_handler.lambda_handler",
        Runtime: "python3.9",
        Timeout : 60,
        FunctionName: "events-handler-lambda-function",
        Architectures : [ "arm64" ],
        TracingConfig : { "Mode": "Active" },
        Environment : {
          "Variables": {
            "REFERENCE_TABLE_NAME": {
             "Ref": "dynamodbRefTablevehicledevicemappingtabledynamodbLogicalIdFA79C9F6"
            },
            "VEHICLE_TABLE_NAME": {
             "Ref": "dynamodbVehicleTablevehicletabledynamodbLogicalId917C0593"
            },
            "DEVICE_TABLE_NAME": {
             "Ref": "dynamodbDeviceTabledevicetabledynamodbLogicalIdE02DFAD2"
            }
           }
        }
      });

      template.hasResourceProperties("AWS::DynamoDB::Table", {
        TableClass : "STANDARD",
        TableName : "vehicle_device_mapping_table",
        BillingMode: "PAY_PER_REQUEST",
        SSESpecification : { "SSEEnabled": true },
        KeySchema : [ 
          {
            "AttributeName": "device_mac_address",
            "KeyType": "HASH"
           }
          ],
          "AttributeDefinitions": [
           {
            "AttributeName": "device_mac_address",
            "AttributeType": "S"
           }
         ]

      });

      // Test for Number of Resource Created
      template.resourceCountIs("AWS::DynamoDB::Table", 3);
      template.resourceCountIs("AWS::IAM::Role", 2);
      template.resourceCountIs("Custom::LogRetention", 1);
      template.resourceCountIs("AWS::IAM::Policy", 2);
      template.resourceCountIs("AWS::Lambda::Function", 2);

      // Sanpshot test
      expect(template.toJSON()).toMatchSnapshot();
    });
  });
