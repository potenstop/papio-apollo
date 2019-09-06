import * as http from "http";
import {RequestOptions} from "http";
import {EnumUtil} from "../util/EnumUtil";
import {ContentTypeEnum} from "../enum/ContentTypeEnum";
import {HttpStatusEnum} from "../enum/HttpStatusEnum";
import {HttpRequestContext} from "../model/HttpRequestContext";
import * as Agent from "agentkeepalive";
import {LoggerFactory} from "type-slf4";
import * as os from "os";
import * as fs from "fs";
import * as path from "path";
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
     * 多个命名空间名称 按逗号分隔
     */
    private namespaceNameStrings: string;

    /**
     * 缓存目录  window:  C:\opt\data\{appId}\config-cache  Mac/Linux: /opt/data/{appId}/config-cache
     */
    private cacheDir: string;

    /**
     * 集群 默认为default
     */
    private cluster: string;


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
        this.updateCacheDir();
    }

    public getNamespaceNameStrings(): string {
        return this.namespaceNameStrings;
    }

    public setNamespaceNameStrings(namespaceNameStrings: string): void {
        this.namespaceNameStrings = namespaceNameStrings;
    }

    public getCacheDir(): string {
        return this.cacheDir;
    }

    public setCacheDir(cacheDir: string): void {
        this.cacheDir = cacheDir;
    }

    public getCluster(): string {
        return this.cluster;
    }

    public setCluster(cluster: string): void {
        this.cluster = cluster;
    }

    constructor() {
        this.metaAddress = "http://meta.apollo.com";
        this.frequency = 30;
        this.appId = "papio-apollo";
        this.cluster = "default";
        this.namespaceNameStrings = "application";
        this.cacheDir = "";
        this.updateCacheDir();
    }
    private updateCacheDir() {
        if (os.type() === "Windows_NT") {
            this.cacheDir = "C:\\opt\\data\\" + this.appId +"\\config-cache"
        } else {
            this.cacheDir = "/opt/data/" + this.appId + "/config-cache"
        }
    }
    public mkCacheDir() {
        fs.mkdirSync(this.cacheDir, { recursive: true });
    }
    public writeByName(namespaceName: string, data: string) {
        this.mkCacheDir();
        const stream = fs.createWriteStream(path.join(this.cacheDir, `${this.appId}+${this.getCluster()}+${namespaceName}.json`));
        stream.write(data);
        stream.close();
    }
    public readByName(namespaceName: string): object {
        // this.mkCacheDir();
        const filePath = path.join(this.cacheDir, `${this.appId}+${this.getCluster()}+${namespaceName}.json`);
        try {
            const dataStr = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(dataStr);
        } catch (e) {
            logger.error("read cache error file:{}", e, filePath);
            return {};
        }
    }
    /**
     * 开始执行定时
     */
    public async startTask() {
        logger.debug("startTask meta:[{}] frequency:[{}] appId:[{}] clusterName:[{}] namespaceNameStrings:[{}]",
            this.getMetaAddress(), this.getFrequency(), this.getAppId(), this.getCluster(), this.getNamespaceNameStrings());
        this.mkCacheDir();
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
        if (map != null) {
            this.syncConfig(map);
        }
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
            requestOptions.path = `/configfiles/json/${this.getAppId()}/${this.getCluster()}/${namespaceName}`;
            logger.debug("pull start path:[{}]", requestOptions.path);
            let jsonData = {};
            try {
                const httpRequestContext = await requestPromise(requestOptions, 5000);
                logger.debug("pull end result:[{}]", JSON.stringify(httpRequestContext.data));
                jsonData = JSON.parse(httpRequestContext.data);
                this.writeByName(namespaceName, JSON.stringify(jsonData, null, "    "))
            } catch (e) {
                logger.error("read server error namespaceName:{}", e, namespaceName);
                // 读取缓存
                jsonData = this.readByName(namespaceName);
            }
            Object.keys(jsonData).forEach((key) => {
                keyMap.set(key, jsonData[key]);
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
