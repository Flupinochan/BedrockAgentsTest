import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Duration } from "aws-cdk-lib";
import * as path from "path";
import { aws_bedrock as bedrock } from 'aws-cdk-lib';
// npm i @cdklabs/generative-ai-cdk-constructs
// https://github.com/aws-samples/generative-ai-cdk-constructs-samples/blob/main/samples/bedrock-agent/lib/bedrock-agent-stack.ts
// import { bedrock } from '@cdklabs/generative-ai-cdk-constructs';


import { Parameters } from "./parameters";

const param = new Parameters();

export class BedrockAgentsTestStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const dynamoTable = new dynamodb.TableV2(this, param.dynamodbTable.name, {
      tableName: param.dynamodbTable.name,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      partitionKey: {
        name: param.dynamodbTable.partitionKeyName,
        type: dynamodb.AttributeType.NUMBER,
      },
    });
    const lambdaRole = new iam.Role(this, param.lambda.roleName, {
      roleName: param.lambda.roleName,
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("CloudWatchFullAccessV2"),
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonBedrockFullAccess"),
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonDynamoDBFullAccess"),
      ],
    });
    const lambdaLog = new logs.LogGroup(this, param.lambda.logName, {
      logGroupName: param.lambda.logName,
      retention: logs.RetentionDays.ONE_DAY,
      logGroupClass: logs.LogGroupClass.STANDARD,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    const lambdaFunction = new lambda.Function(this, param.lambda.name, {
      functionName: param.lambda.name,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: "index.lambda_handler",
      role: lambdaRole,
      code: lambda.Code.fromAsset(path.join(__dirname, "../../lambda/code/")),
      timeout: Duration.minutes(15),
      logGroup: lambdaLog,
      environment: {
        DYNAMODB_TABLE: dynamoTable.tableName,
        PRIMARY_KEY: param.dynamodbTable.partitionKeyName,
      },
    });
    lambdaFunction.addPermission(
      "lambdaPermission",
      {
        action: "lambda:InvokeFunction",
        principal: new iam.ServicePrincipal("bedrock.amazonaws.com"),
        sourceArn: `arn:aws:bedrock:${this.region}:${this.account}:agent/*`,
      }
    );
    // const bedrockAgentSchema = new s3.Bucket(this, param.s3.name, {
    //   bucketName: param.s3.name,
    //   removalPolicy: cdk.RemovalPolicy.DESTROY,
    //   autoDeleteObjects: true,
    //   lifecycleRules: [
    //     {
    //       enabled: true,
    //       expiration: Duration.days(1),
    //     },
    //   ],
    // });
    // new s3deploy.BucketDeployment(this, "s3DeployFile", {
    //   sources: [s3deploy.Source.asset(path.join(__dirname, "../../openapi_schema"))],
    //   destinationBucket: bedrockAgentSchema,
    // });
    const bedrockRole = new iam.Role(this, param.bedrockAgent.roleName, {
      roleName: param.bedrockAgent.roleName,
      assumedBy: new iam.ServicePrincipal("bedrock.amazonaws.com"),
      inlinePolicies: {
        inlinePolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ["bedrock:InvokeModel"],
              resources: ["*"],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ["lambda:InvokeFunction"],
              resources: [lambdaFunction.functionArn],
            }),
          ],
        }),
      },
    });
    const cfnBedrockAgent = new bedrock.CfnAgent(this, param.bedrockAgent.name, {
      agentName: param.bedrockAgent.name,
      agentResourceRoleArn: bedrockRole.roleArn,
      idleSessionTtlInSeconds: 300,
      foundationModel: "anthropic.claude-3-haiku-20240307-v1:0",
      skipResourceInUseCheckOnDelete: true,
      instruction: "You are an banking assistant in a Retail Bank. You are friendly and polite. You help resolve customer queries by providing bank customers status on their new bank accounts.",
      actionGroups: [{
        actionGroupName: 'actionGroup1',
        actionGroupState: 'ENABLED',
        actionGroupExecutor: {
          lambda: lambdaFunction.functionArn,
        },
        apiSchema: {
          payload: `openapi: 3.0.0
info:
  title: Retail Banking - New account opening status for the customer
  version: 1.0.0
  # Important - Prompt semantically matched to description
  description: API for determining the status of new accounts opened based on AccountID and reason for pending status 
paths:
  # Lambda Function Name with Input Parameter
  /customerAccountStatusLambda/{AccountID}/:
    get:
      summary: Get a list of all open new accounts and thier status
      description: Get a list of all open new accounts and thier status
      operationId: getAllOpenAccountStatus
      # Input Parameter
      parameters:
      - name : AccountID
        in: path
        description: The account ID of the customer looking for status
        required: true
        schema:
          type: integer
      # Response Parameter from lambda
      responses:
        '200':
          description: Successful response containing the account status details
          content:
            application/json:
              schema:
                type: object
                properties:
                  AccountName:
                    type: string
                    description: The name of the customer corresponding to AccountID
                  AccountID:
                    type: integer
                    description: The account id of the customer  
                  Reason:
                    type: string
                    description: The reason for open status
                  Status:
                    type: string
                    description: The status of the accountid provided
        '404':
          description: Error response without account information
          content:
            application/json:
              schema:
                type: object
                properties:
                  Error:
                    type: string
                    description: When the account cannot be found
`,
        },
        skipResourceInUseCheckOnDelete: true,
      }],
    });

  }
}
