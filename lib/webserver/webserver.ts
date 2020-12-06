import { CfnOutput, Fn, Stack } from "@aws-cdk/core";
import { SubnetSelection, CloudFormationInit, InitCommand, InitConfig, InitPackage, Instance, InstanceClass, InstanceSize, InstanceType, MachineImage, Peer, Port, SecurityGroup, Subnet, Vpc, SubnetType, AmazonLinuxGeneration, InitServiceRestartHandle, InitService, InitSource} from "@aws-cdk/aws-ec2";
import { Db } from "../database/db";

export class Webserver {
    constructor(stack: Stack, vpc: Vpc, sg: SecurityGroup, db: Db) {
        
        const webroot = '/var/www/html';

        const amznLinux = MachineImage.latestAmazonLinux({
            generation: AmazonLinuxGeneration.AMAZON_LINUX_2,
        });

        const handle = new InitServiceRestartHandle();
        const instance = new Instance(stack, "Wordpress Server", {
            instanceType: InstanceType.of(InstanceClass.T2, InstanceSize.MICRO),
            initOptions: {
                printLog: true,
                ignoreFailures: true,
            },
            machineImage: amznLinux,
            vpc: vpc,
            vpcSubnets: {
                subnetType: SubnetType.PUBLIC,
            },
            instanceName: "Wordpress Server",
            init: CloudFormationInit.fromConfig(new InitConfig([
                // Wordpress dependencies
                InitPackage.yum('php'),
                InitPackage.yum('php-mysql'),
                InitCommand.shellCommand("amazon-linux-extras install -y php7.3"),
                InitPackage.yum('git'),         // For synchronizing the deployed site with updates releases in github.
                InitService.enable("httpd", {
                    enabled: true,
                    ensureRunning: true,
                    serviceRestartHandle: handle,
                }),
                InitSource.fromGitHub(webroot, 'F3NATX', 'F3AustinWP', "mainline"),
                InitCommand.shellCommand('mv wp-config-sample.php wp-config.php', { cwd: webroot }),
                InitCommand.shellCommand(Fn.sub('perl -pi -e "s/database_name_here/${dbname}/g" wp-config.php', {
                    "dbname": db.dbName,
                }), { cwd: webroot }),
                InitCommand.shellCommand(Fn.sub('perl -pi -e "s/username_here/${dbuser}/g" wp-config.php', {
                    "dbuser": db.mysqlUser,
                }), { cwd: webroot }),
                InitCommand.shellCommand(Fn.sub('perl -pi -e "s/password_here/${dbpass}/g" wp-config.php', {
                    "dbpass": db.mysqlPassword,
                }), { cwd: webroot }),
                InitCommand.shellCommand(Fn.sub('perl -pi -e "s/localhost/${endpoint}/g" wp-config.php', {
                    "endpoint": db.hostname,
                }), { cwd: webroot }),
                InitCommand.shellCommand(`perl -i -pe'
                                            BEGIN {
                                            @chars = ("a" .. "z", "A" .. "Z", 0 .. 9);
                                            push @chars, split //, "!@#$%^&*()-_ []{}<>~\`+=,.;:/?|";
                                            sub salt { join "", map $chars[ rand @chars ], 1 .. 64 }
                                            }
                                            s/put your unique phrase here/salt()/ge
                                        ' wp-config.php`, { cwd: webroot }),
                InitCommand.shellCommand('mkdir wp-content/uploads', { cwd: webroot }),
                InitCommand.shellCommand('chown apache wp-content/uploads', { cwd: webroot }),
                InitCommand.shellCommand('chmod 755 wp-content/uploads', { cwd: webroot }),
                InitCommand.shellCommand("systemctl start httpd"),
                InitCommand.shellCommand("systemctl enable httpd"),
            ])),
            securityGroup: sg,
        });

        new CfnOutput(stack, "Wordpress Server IP Address", {
            value: instance.instancePublicIp,
        })
    }
}