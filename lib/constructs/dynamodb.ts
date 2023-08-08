import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';


export interface DyDbTableProps {
  tableName: string;
  partitionKey: string;
  stream?: dynamodb.StreamViewType
}

export default class DynamoDbTable extends Construct {
  public readonly dynamodbTable: dynamodb.ITable;

  constructor(
    private readonly scope: Construct, 
    private readonly id: string, 
    private readonly props: DyDbTableProps) {
    super(scope, id);

    this.dynamodbTable = this.createDynamodbTable();
  }

  public getDynamoDbTable() : dynamodb.ITable {
    return this.dynamodbTable;
  }

  private createDynamodbTable() : dynamodb.ITable {

    return new dynamodb.Table(this, `${this.props.tableName}dynamodbLogicalId`, {
        tableName: this.props.tableName,
        partitionKey: { name: this.props.partitionKey, type: dynamodb.AttributeType.STRING },
        tableClass: dynamodb.TableClass.STANDARD,
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        encryption: dynamodb.TableEncryption.AWS_MANAGED,
        stream: this.props.stream
      });
  }
}
