import * as cdk from 'aws-cdk-lib';
import { aws_dynamodb as dynamodb, aws_lambda as lambda, Stack,StackProps } from 'aws-cdk-lib';
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Construct } from 'constructs';
import DynamoDbTable from './constructs/dynamodb';
import IotEventsHandlerLambda from './constructs/lambdas';

interface PnlIotAssignmentStackProps extends cdk.StackProps {
  readonly referenceTableName: string;
  readonly referenceTablePartitionkey: string;
  readonly vehicleTableName: string;
  readonly vehicleTablePartitionKey: string;
  readonly deviceTableName: string;
  readonly deviceTablePartitionKey: string;
  readonly lambdaLayerName: string;
  readonly lambdaFunctionName: string;
  readonly lambdaAliasName: string;
  readonly snsTopicArn: string;
}


export class PnlIotAssignmentStack extends Stack {
  constructor(scope: Construct, id: string, props: PnlIotAssignmentStackProps) {
    super(scope, id, props);

    
    // Step 1 : Create DynamoDB Reference Table.
    const referenceTableResource = new DynamoDbTable(this, 'dynamodbRefTable', {
      tableName : props.referenceTableName,
      partitionKey : props.referenceTablePartitionkey
    });

    // Step 2 : Create DynamoDB Vehicle Table.
    const vehicleTableResource = new DynamoDbTable(this, 'dynamodbVehicleTable', {
      tableName :props.vehicleTableName,
      partitionKey : props.vehicleTablePartitionKey
    });


    // Step 3 : Create DynamoDB Reference Table.
    const deviceTableResource = new DynamoDbTable(this, 'dynamodbDeviceTable', {
      tableName : props.deviceTableName,
      partitionKey :props.deviceTablePartitionKey,
      stream: dynamodb.StreamViewType.NEW_IMAGE
    });


    // Step 5 : create Lambda function
    const lambdaResource = new IotEventsHandlerLambda(this, 'pocDemoLambda', {
      dynamodbReferenceTableName : referenceTableResource.getDynamoDbTable().tableName,
      dynamodbVehicleTableName : vehicleTableResource.getDynamoDbTable().tableName,
      dynamodbDeviceTableName : deviceTableResource.getDynamoDbTable().tableName,
      lambdaLayerName : props.lambdaLayerName,
      lambdaFunctionName: props.lambdaFunctionName,
      lambdaAliasName : props.lambdaAliasName,
      snsTopicArn : props.snsTopicArn,
    });

    
    // Step 6 : Provide Lambda function permission to read Reference Table
    referenceTableResource.getDynamoDbTable().grantReadData(lambdaResource.getLambdaFunction());

    // Step 7 : Provide Lambda function permission to read Vehicle Table
    vehicleTableResource.getDynamoDbTable().grantReadData(lambdaResource.getLambdaFunction());

    // Step 8 : Provide Lambda function permission to read stream of Device Table Table
    deviceTableResource.getDynamoDbTable().grantStreamRead(lambdaResource.getLambdaFunction());

    // Step 9 : add event source mapping for Device Dynamodb table and Lambda
    lambdaResource.getLambdaFunction().addEventSource(
      new DynamoEventSource(deviceTableResource.getDynamoDbTable(), {
        startingPosition: lambda.StartingPosition.LATEST,
      })
    );
  }
}
