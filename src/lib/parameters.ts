export class Parameters {
  env = {
    region: "us-west-2",
  };
  dynamodbTable = {
    name: "customerAccountStatus",
    partitionKeyName: "AccountID",
  };
  lambda = {
    name: "customerAccountStatusLambda",
    logName: "customerAccountStatusLog",
    roleName: "customerAccountStatusRole",
  };
  s3 = {
    name: "customer-account-status-bucket",
  };
  bedrockAgent = {
    name: "customerAccountStatusBedrock",
    roleName: "customerAccountStatusBedrockRole",
  }
}