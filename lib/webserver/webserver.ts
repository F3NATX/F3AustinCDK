import { CfnOutput, Fn, Stack } from '@aws-cdk/core';
import {
    CloudFormationInit,
    InitCommand,
    InitConfig,
    InitPackage,
    Instance,
    InstanceClass,
    InstanceSize,
    InstanceType,
    MachineImage,
    SecurityGroup,
    Vpc,
    SubnetType,
    AmazonLinuxGeneration,
    InitServiceRestartHandle,
    InitService,
} from '@aws-cdk/aws-ec2';
import { Db } from '../database/db';

export class Webserver {
    constructor(stack: Stack, vpc: Vpc, sg: SecurityGroup, db: Db) {
        const webroot = '/var/www/html';

        const amznLinux = MachineImage.latestAmazonLinux({
            generation: AmazonLinuxGeneration.AMAZON_LINUX_2,
        });

        const handle = new InitServiceRestartHandle();
        const instance = new Instance(stack, 'Wordpress Server', {
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
            instanceName: 'Wordpress Server',
            init: CloudFormationInit.fromConfig(
                new InitConfig([
                    // Wordpress dependencies
                    InitPackage.yum('php'),
                    InitPackage.yum('php-mysql'),
                    InitCommand.shellCommand('amazon-linux-extras install -y php7.3'),
                    // Start the webserver on the host
                    InitService.enable('httpd', {
                        enabled: true,
                        ensureRunning: true,
                        serviceRestartHandle: handle,
                    }),

                    // For synchronizing the deployed site with updates releases in github.
                    InitCommand.shellCommand('yum install mysql -y'),
                    // Utility used by VersionPress system
                    InitCommand.shellCommand('yum install php-mbstring -y'),
                    InitCommand.shellCommand('yum install php-gd -y'),

                    // For synchronizing the deployed site with updates releases in github.
                    InitPackage.yum('git'),

                    // Copying the latest F3Austin wordpress website
                    InitCommand.shellCommand('git clone https://github.com/F3NATX/F3AustinWP ' + webroot),

                    // Update the wordpress sample configuration to communicate with the database
                    InitCommand.shellCommand('mv wp-config-sample.php wp-config.php', { cwd: webroot }),
                    InitCommand.shellCommand(
                        Fn.sub('perl -pi -e "s/database_name_here/${dbname}/g" wp-config.php', {
                            dbname: db.dbName,
                        }),
                        { cwd: webroot }
                    ),
                    InitCommand.shellCommand(
                        Fn.sub('perl -pi -e "s/username_here/${dbuser}/g" wp-config.php', {
                            dbuser: db.mysqlUser,
                        }),
                        { cwd: webroot }
                    ),
                    InitCommand.shellCommand(
                        Fn.sub('perl -pi -e "s/password_here/${dbpass}/g" wp-config.php', {
                            dbpass: db.mysqlPassword,
                        }),
                        { cwd: webroot }
                    ),
                    InitCommand.shellCommand(
                        Fn.sub('perl -pi -e "s/localhost/${dbendpoint}/g" wp-config.php', {
                            dbendpoint: db.hostname,
                        }),
                        { cwd: webroot }
                    ),
                    InitCommand.shellCommand(
                        `perl -i -pe'
                            BEGIN {
                            @chars = ("a" .. "z", "A" .. "Z", 0 .. 9);
                            push @chars, split //, "!@#$%^&*()-_ []{}<>~\`+=,.;:/?|";
                            sub salt { join "", map $chars[ rand @chars ], 1 .. 64 }
                            }
                            s/put your unique phrase here/salt()/ge
                        ' wp-config.php`,
                        { cwd: webroot }
                    ),

                    // Setup upload directory on the host
                    InitCommand.shellCommand('mkdir wp-content/uploads', {
                        cwd: webroot,
                    }),
                    InitCommand.shellCommand('chmod 755 wp-content/uploads', {
                        cwd: webroot,
                    }),
                    // This is giving apache ownership over the entire webroot, not just the single folder
                    InitCommand.shellCommand(`chown -R apache ${webroot}`, {
                        cwd: webroot,
                    }),

                    // TODO: HOW TO SECURE .GIT FOLDERS???

                    // Make sure httpd webserver is up and will automatically be restarted on reboot
                    InitCommand.shellCommand('systemctl start httpd'),
                    InitCommand.shellCommand('systemctl enable httpd'),

                    // Unforunately this command doesn't work, I'll need to look into how this is possible or modify
                    // the chained commands into a script file.
                    // Update the mysql db to point to the latest url for the site
                    // InitCommand.shellCommand(
                    //     Fn.sub(
                    //         `ipaddress=$(curl http://169.254.169.254/latest/meta-data/public-ipv4 -s)
                    //          | echo "UPDATE wp_options SET option_value='http://$ipaddress' WHERE option_name IN ('siteurl', 'home');"
                    //          | mysql --host=\${dbendpoint} --database=\${dbname} --user=\${dbname} --password=\${dbpass}`,
                    //         {
                    //             dbendpoint: db.hostname,
                    //             dbname: db.dbName,
                    //             dbuser: db.mysqlUser,
                    //             dbpass: db.mysqlPassword,
                    //         }
                    //     )
                    // ),
                ])
            ),
            securityGroup: sg,
        });

        new CfnOutput(stack, 'Wordpress Server IP Address', {
            value: instance.instancePublicIp,
        });
    }
}
