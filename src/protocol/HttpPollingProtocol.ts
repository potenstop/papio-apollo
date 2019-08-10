import * as http from "http";
import {RequestOptions} from "http";
import {EnumUtil} from "../util/EnumUtil";
import {ContentTypeEnum} from "../enum/ContentTypeEnum";
import {HttpStatusEnum} from "../enum/HttpStatusEnum";
import {HttpRequestContext} from "../model/HttpRequestContext";
import * as Agent from "agentkeepalive";
import {LoggerFactory} from "type-slf4";
import {log} from "util";
const logger = LoggerFactory.getLogger("papio-apollo.protocol.HttpPollingProtocol");
/**
 *
 * 功能描述: http长轮询请求方式
 *
 * @className HttpProtocol
 * @projectName papio-apollo
 * @author yanshaowen
 * @date 2019/8/8 17:51
 */
export class HttpPollingProtocol {
    /**
     * meta服务器地址
     */
    private metaAddress: string;

    /**
     * 轮询的频率 单位s
     */
    private frequency: number;

    /**
     * appId
     */
    private appId: string;

    /**
     * 集群名称
     */
    private clusterName: string;

    /**
     * 多个命名空间名称 按逗号分隔
     */
    private namespaceNameStrings: string;

    public getMetaAddress(): string {
        return this.metaAddress;
    }
    public setMetaAddress(metaAddress: string): void {
        this.metaAddress = metaAddress;
    }

    public getFrequency(): number {
        return this.frequency;
    }

    public setFrequency(frequency: number): void {
        this.frequency = frequency;
    }

    public getAppId(): string {
        return this.appId;
    }

    public setAppId(appId: string): void {
        this.appId = appId;
    }

    public getClusterName(): string {
        return this.clusterName;
    }

    public setClusterName(clusterName: string): void {
        this.clusterName = clusterName;
    }

    public getNamespaceNameStrings(): string {
        return this.namespaceNameStrings;
    }

    public setNamespaceNameStrings(namespaceNameStrings: string): void {
        this.namespaceNameStrings = namespaceNameStrings;
    }

    constructor() {
        this.metaAddress = "http://meta.apollo.com";
        this.frequency = 30;
        this.appId = "papio-apollo";
        this.clusterName = "default";
        this.namespaceNameStrings = "application";

    }

    /**
     * 开始执行定时
     */
    public async startTask() {
        logger.debug("startTask meta:[{}] frequency:[{}] appId:[{}] clusterName:[{}] namespaceNameStrings:[{}]",
            this.getMetaAddress(), this.getFrequency(), this.getAppId(), this.getClusterName(), this.getClusterName(), this.getNamespaceNameStrings());
        await this.pullAndSync();
        setInterval(async () => {
            await this.pullAndSync();
        }, this.frequency * 1000);
    }
    private async pullAndSync() {
        let map = null;
        try {
            map = await this.pull();
        } catch (e) {
            logger.error("pull error", e);
        }
        this.syncConfig(map);
    }
    /**
     * 进行一次pull
     */
    public async pull(): Promise<Map<string, string>> {
        // 进行一次请求
        const namespaceNameList = this.namespaceNameStrings.split(",");
        const keyMap = new Map<string, string>();
        for (const namespaceName of namespaceNameList) {
            const requestOptions: RequestOptions = {};
            // requestOptions.agent = this.options.agent;
            const url = new URL(this.metaAddress);
            requestOptions.host = url.hostname;
            requestOptions.port = url.port;
            requestOptions.method = "GET";
            requestOptions.agent = new Agent({
                maxSockets: 100,
                maxFreeSockets: 10,
                timeout: 60000,
                freeSocketTimeout: 30000,
            });
            requestOptions.path = `/configfiles/json/${this.getAppId()}/${this.getClusterName()}/${namespaceName}`;
            logger.debug("pull start path:[{}]", requestOptions.path);
            const httpRequestContext = await requestPromise(requestOptions, 5000);
            logger.debug("pull end result:[{}]", httpRequestContext);
            const json = JSON.parse(httpRequestContext.data);
            Object.keys(json).forEach((key) => {
                keyMap.set(key, json[key]);
            });
        }
        return keyMap;
    }

    /**
     * 同步配置
     */
    public syncConfig(config: Map<string, string>) {
        // @ts-ignore
        const papioApplication = global.papioApplication;
        // @ts-ignore
        const papioApplicationSourceKeys = global.papioApplicationSourceKeys;
        if (papioApplication instanceof Map && papioApplicationSourceKeys instanceof Set) {
            const papioApplicationNew = new Map<string, string>();
            // 遍历papioApplicationSourceKeys copy application.json的配置
            papioApplicationSourceKeys.forEach((key) => {
                if (papioApplication.has(key)) {
                    papioApplicationNew.set(key, papioApplication.get(key));
                }
            });
            config.forEach((value, key) => {
                if (!papioApplicationSourceKeys.has(key)) {
                    papioApplicationNew.set(key, value);
                }
            });
            // @ts-ignore
            global.papioApplication = papioApplicationNew;
        } else {
            // @ts-ignore
            global.papioApplication = config;
        }
    }
}
async function requestPromise(options: RequestOptions, timeout: number, requestBody?: object): Promise<HttpRequestContext> {
    let isReturn = false;
    const requestContext = new HttpRequestContext();
    requestContext.options = options;
    requestContext.timeout = timeout;
    requestContext.startDatetime = new Date();
    return new Promise<HttpRequestContext>((resolve, reject) => {
        const req = http.request(options, (res) => {
            requestContext.res = res;
            if (res.statusCode !== HttpStatusEnum.OK) {
                return reject(new Error(`request status(${res.statusCode}) not equal 200`));
            }
            let contentType = "application/json; charset=utf-8";
            if (res.headers && res.headers["content-type"]) {
                contentType = res.headers["content-type"];
            }
            const strings = contentType.split(";");
            if (strings.length > 0) {
                requestContext.resContentType = EnumUtil.getValueEnum(ContentTypeEnum, strings[0]);
            }
            if (strings.length > 1) {
                const ch = strings[1].split("=");
                if (ch.length === 2 && ch[0].trim() === "charset") {
                    requestContext.resCharset = ch[1];
                    res.setEncoding(ch[1].replace(/-/g, ""));
                }
            }
            let body = "";
            res.on("data", function(chunk) {
                body += chunk;
            });
            res.on("end", () => {
                if (!isReturn) {
                    isReturn = true;
                    // requestContext.
                    requestContext.data = body;
                    requestContext.endDatetime = new Date();
                    requestContext.consuming = requestContext.endDatetime.getTime() - requestContext.startDatetime.getTime();
                    return resolve(requestContext);
                }
            });
        });
        requestContext.req = req;
        if (timeout) {
            req.setTimeout(timeout,  () => {
                if (!isReturn) {
                    isReturn = true;
                    return reject(new Error(`request timeout(${timeout})`));
                }
                req.abort();
            });
        }
        req.on("error", (e: any) => {
            if (!isReturn) {
                isReturn = true;
                return reject(e);
            }
        });
        if (requestBody) {
            req.write(JSON.stringify(requestBody));
        }
        req.end();
    });
}
