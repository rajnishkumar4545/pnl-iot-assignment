import { aws_dynamodb as dynamodb, aws_lambda as lambda ,Stack, StackProps } from 'aws-cdk-lib';
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Construct } from 'constructs';
import DynamoDbTable from './constructs/dynamodb';
import DemoPocLambda from './constructs/lambdas';

export class CdkDemoProjectStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);


    // Step 1 : Create DynamoDB Reference Table.
    const referenceTableResource = new DynamoDbTable(this, 'dynamodbRefTable', {
      tableName : 'demo-ref-table',
      partitionKey : 'device_mac_address'
    });

    // Step 2 : Create DynamoDB Vehicle Table.
    const vehicleTableResource = new DynamoDbTable(this, 'dynamodbVehicleTable', {
      tableName : 'demo-vehicle-table',
      partitionKey : 'vehicle_mac_address'
    });


    // Step 3 : Create DynamoDB Reference Table.
    const deviceTableResource = new DynamoDbTable(this, 'dynamodbDeviceTable', {
      tableName : 'demo-device-table',
      partitionKey : 'device_mac_address',
      stream: dynamodb.StreamViewType.NEW_IMAGE
    });


    // Step 5 : create Lambda function
    const lambdaResource = new DemoPocLambda(this, 'pocDemoLambda', {
      dynamodbReferenceTableName : referenceTableResource.getDynamoDbTable().tableName,
      dynamodbVehicleTableName : vehicleTableResource.getDynamoDbTable().tableName,
      dynamodbDeviceTableName : deviceTableResource.getDynamoDbTable().tableName
    });

    
    // // Step 6 : Provide Lambda function permission to read Reference Table
    // referenceTableResource.getDynamoDbTable().grantReadData(lambdaResource.getLambdaFunction());

    // // Step 7 : Provide Lambda function permission to read Vehicle Table
    // vehicleTableResource.getDynamoDbTable().grantReadData(lambdaResource.getLambdaFunction());

    // // Step 8 : Provide Lambda function permission to read stream of Device Table Table
    // deviceTableResource.getDynamoDbTable().grantStreamRead(lambdaResource.getLambdaFunction());

    // // Step 9 : add event source mapping for Device Dynamodb table and Lambda
    // lambdaResource.getLambdaFunction().addEventSource(
    //   new DynamoEventSource(deviceTableResource.getDynamoDbTable(), {
    //     startingPosition: lambda.StartingPosition.LATEST,
    //   })
    // );
  }
}
