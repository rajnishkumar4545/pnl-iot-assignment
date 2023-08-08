import {
    aws_iam as iam,
    aws_lambda as lambda,
    aws_logs as logs,
    Duration,
    Aws,
    Stack,
  } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { join } from 'path';
import path from 'path';


  export interface CommonLambdaProps extends Partial<lambda.FunctionProps> {
    readonly dynamodbReferenceTableName: string;
    readonly dynamodbVehicleTableName : string;
    readonly dynamodbDeviceTableName : string;
    readonly lambdaFunctionName : string;
    readonly lambdaLayerName: string;
    readonly lambdaAliasName: string;
    readonly snsTopicArn : string;
  }

  export default class IotEventsHandlerLambda extends Construct {
    
    private readonly lambdaFunction: lambda.Function;
    
    constructor(
      private readonly scope: Construct,
      private readonly id: string,
      private readonly commonProps: CommonLambdaProps,
    ) {
      super(scope, id);
      this.lambdaFunction = this.createLambdaFunction();
    }
    
    public getLambdaFunction() {
        return this.lambdaFunction;
    }
    
    private addLambdaPermissions() {
      return [
        new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: [`arn:aws:logs:${Aws.REGION}:${Aws.ACCOUNT_ID}:*`],
            actions: [
              'logs:CreateLogGroup',
            ],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: [`arn:aws:logs:${Aws.REGION}:${Aws.ACCOUNT_ID}:log-group:/aws/lambda/*`],
            actions: [
              'logs:CreateLogStream',
              'logs:PutLogEvents',
            ],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: [ this.commonProps.snsTopicArn ],
            actions: [
              "sns:Publish",
              "sns:ListTopics"
            ],
          }),
      ];
    }
  
    private createLambdaLayer() {
      return new lambda.LayerVersion(this, 'eventsHandlerLambdaLayer', {
        layerVersionName: this.commonProps.lambdaLayerName,
        code: lambda.Code.fromAsset(path.join(__dirname, '../../src/lambda_layer')),
        compatibleArchitectures: [lambda.Architecture.ARM_64],
        license: 'Assignment Purpose',
      });
    }
    
    private getLambdaEnvVariable() {
        return {
            REFERENCE_TABLE_NAME : this.commonProps.dynamodbReferenceTableName,
            VEHICLE_TABLE_NAME : this.commonProps.dynamodbVehicleTableName,
            DEVICE_TABLE_NAME : this.commonProps.dynamodbDeviceTableName,
            SNS_ARN: this.commonProps.snsTopicArn
        };
    }

    private createLambdaFunction(): lambda.Function {
      const lambdaFunction = new lambda.Function(
        this,
        'EventsHandlerLambda',
        {
          functionName: this.commonProps.lambdaFunctionName,
          description: 'IoT Events Handler Lambda Function',
          code: lambda.Code.fromAsset(join(__dirname, '../../src/lambda'), {
            exclude: ['**', '!iot_events_handler.py'],
          }),
          handler: 'iot_events_handler.lambda_handler',
          timeout: Duration.minutes(1),
          tracing: lambda.Tracing.ACTIVE,
          logRetention: logs.RetentionDays.ONE_WEEK,
          runtime: lambda.Runtime.PYTHON_3_9,
          architecture: lambda.Architecture.ARM_64,
          environment: this.getLambdaEnvVariable(),
          layers: [this.createLambdaLayer()],
          initialPolicy: this.addLambdaPermissions(),
        },
      );
    
      const lambdaVersion = this.createLambdaVersion(lambdaFunction);
      this.createLambdaAlias(lambdaFunction, lambdaVersion);
      return lambdaFunction;
    }
    
    private createLambdaAlias(
      lambdaFunction: lambda.Function,
      lambdaVersion: lambda.IVersion,
    ) {
      return new lambda.Alias(
        this.scope,
        'eventsHandlerAlias',
        {
          aliasName: this.commonProps.lambdaAliasName,
          version: lambdaVersion,
        },
      );
    }
    
    private createLambdaVersion(lambdaFunction: lambda.Function) {
      return new lambda.Version(
        this.scope,
        'eventsHandlerLambdaVersionId',
        {
          lambda: lambdaFunction,
        },
      );
    }
  }

