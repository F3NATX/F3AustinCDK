import { CfnOutput, SecretValue, Stack } from '@aws-cdk/core';
import { DatabaseInstance, DatabaseInstanceEngine, MysqlEngineVersion } from '@aws-cdk/aws-rds';
import { InstanceClass, InstanceSize, InstanceType, Port, SecurityGroup, Vpc } from '@aws-cdk/aws-ec2';

export class Db {
    public readonly hostname: string;
    public readonly dbName = 'wp';
    public readonly mysqlUser = 'admin';
    public readonly mysqlPassword = 'abc1234Abc';

    constructor(stack: Stack, vpc: Vpc, ec2SecurityGroup: SecurityGroup) {
        const dbinstance = new DatabaseInstance(stack, 'wordpress-mysql', {
            databaseName: this.dbName,
            vpc,
            engine: DatabaseInstanceEngine.mysql({
                version: MysqlEngineVersion.VER_8_0,
            }),
            instanceType: InstanceType.of(InstanceClass.T2, InstanceSize.MICRO),
            iamAuthentication: true,
            credentials: {
                username: this.mysqlUser,
                password: SecretValue.plainText(this.mysqlPassword),
            },
        });

        dbinstance.connections.allowFrom(ec2SecurityGroup, Port.tcp(3306));

        this.hostname = dbinstance.instanceEndpoint.hostname;

        new CfnOutput(stack, 'DbEndpoint', {
            value: dbinstance.instanceEndpoint.hostname,
        });
    }
}
