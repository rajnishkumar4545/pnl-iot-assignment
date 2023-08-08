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
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';


  export interface CommonLambdaProps extends Partial<lambda.FunctionProps> {
    readonly dynamodbReferenceTableName: string;
    readonly dynamodbVehicleTableName : string;
    readonly dynamodbDeviceTableName : string;
  }

  export default class DemoPocLambda extends Construct {
    
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
            resources: [ this.node.tryGetContext("sns_topic_arn")],
            actions: [
              "sns:Publish",
              "sns:ListTopics"
            ],
          }),
      ];
    }
  
    private createLambdaLayer() {
      return new lambda.LayerVersion(this, 'cdkDemoLambdaLayer', {
        layerVersionName: 'cdk-demo-lambda-layer',
        // code: lambda.Code.fromAsset('src/lambda_layer'),
        code: lambda.Code.fromAsset(path.join(__dirname, '../../src/lambda_layer')),
        compatibleArchitectures: [lambda.Architecture.ARM_64],
        license: 'Learning Purpose',
      });
    }
    
    private getLambdaEnvVariable() {
        return {
            REFERENCE_TABLE_NAME : this.commonProps.dynamodbReferenceTableName,
            VEHICLE_TABLE_NAME : this.commonProps.dynamodbVehicleTableName,
            DEVICE_TABLE_NAME : this.commonProps.dynamodbDeviceTableName,
            SNS_ARN: this.node.tryGetContext("sns_topic_arn")
        };
    }

    private createLambdaFunction(): lambda.Function {
      const lambdaFunction = new lambda.Function(
        this,
        'DemoLambda',
        {
          functionName: 'demo-lambda-function',
          description: 'Demo Lambda Function',
          code: lambda.Code.fromAsset(join(__dirname, '../../src/lambda'), {
            exclude: ['**', '!demo_lambda.py'],
          }),
          handler: 'demo_lambda.lambda_handler',
          timeout: Duration.minutes(10),
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

    // private createLambdaFunction(): PythonFunction {
    //   const lambdaFunction = new PythonFunction(
    //     this,
    //     'DemoLambda',
    //     {
    //       functionName: 'demo-lambda-function',
    //       description: 'Demo Lambda Function',
    //       entry: path.resolve(__dirname, '../../src/lambda/'),
    //       index: 'demo_lambda.py',
    //       handler: 'lambda_handler',
    //       timeout: Duration.minutes(10),
    //       tracing: lambda.Tracing.ACTIVE,
    //       logRetention: logs.RetentionDays.ONE_WEEK,
    //       runtime: lambda.Runtime.PYTHON_3_9,
    //       architecture: lambda.Architecture.ARM_64,
    //       environment: this.getLambdaEnvVariable(),
    //       layers: [this.createLambdaLayer()],
    //       initialPolicy: this.addLambdaPermissions(),
    //     },
    //   );
    
    //   const lambdaVersion = this.createLambdaVersion(lambdaFunction);
    //   this.createLambdaAlias(lambdaFunction, lambdaVersion);
    //   return lambdaFunction;
    // }
    
    private createLambdaAlias(
      lambdaFunction: lambda.Function,
      lambdaVersion: lambda.IVersion,
    ) {
      return new lambda.Alias(
        this.scope,
        'demoLambdaAlias',
        {
          aliasName: 'demo-lambda-alias',
          version: lambdaVersion,
        },
      );
    }
    
    private createLambdaVersion(lambdaFunction: lambda.Function) {
      return new lambda.Version(
        this.scope,
        'demoLambdaVersionId',
        {
          lambda: lambdaFunction,
        },
      );
    }
  }

