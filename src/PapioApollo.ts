import {HttpPollingProtocol} from "./protocol/HttpPollingProtocol";
import {GlobalEnum} from "./enum/GlobalEnum";

/**
 *
 * 功能描述:
 *
 * @className PapioApollo
 * @projectName papio-apollo
 * @author yanshaowen
 * @date 2019/8/8 11:52
 */
export class PapioApollo {
    public static start() {
        return async function() {
            const httpPollingProtocol = new HttpPollingProtocol();
            // @ts-ignore
            const papioApplication = global[GlobalEnum.PAPIO_APPLICATION];
            if (papioApplication.has(GlobalEnum.APP_ID)) {
                httpPollingProtocol.setAppId(papioApplication.get(GlobalEnum.APP_ID));
            }
            if (papioApplication.has(GlobalEnum.APOLLO_META)) {
                httpPollingProtocol.setMetaAddress(papioApplication.get(GlobalEnum.APOLLO_META));
            }
            if (papioApplication.has(GlobalEnum.APOLLO_BOOTSTRAP_NAMESPACES)) {
                httpPollingProtocol.setNamespaceNameStrings(papioApplication.get(GlobalEnum.APOLLO_BOOTSTRAP_NAMESPACES));
            }
            if (papioApplication.has(GlobalEnum.APOLLO_CACHEDIR)) {
                httpPollingProtocol.setCacheDir(papioApplication.get(GlobalEnum.APOLLO_CACHEDIR));
            }
            if (papioApplication.has(GlobalEnum.APOLLO_CLUSTER)) {
                httpPollingProtocol.setCluster(papioApplication.get(GlobalEnum.APOLLO_CLUSTER));
            }
            await httpPollingProtocol.startTask();
        };
    }
}
