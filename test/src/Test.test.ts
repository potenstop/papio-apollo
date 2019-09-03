import {expect} from "chai";
import {Value} from "../../src/annotation/Value";
import {HttpPollingProtocol} from "../../src/protocol/HttpPollingProtocol";
import {GlobalEnum} from "../../src/enum/GlobalEnum";

class A {
    @Value("server.port")
    private name: string;

    public getName(): string {
        return this.name;
    }
}
describe("测试", () => {
    it("value", async () => {
        global[GlobalEnum.PAPIO_APPLICATION] = new Map().set("server.port", 80);

        let httpPollingProtocol = new HttpPollingProtocol();
        httpPollingProtocol.setAppId("papio-apollo");
        httpPollingProtocol.setMetaAddress("http://106.12.25.204:8081");
        httpPollingProtocol.setNamespaceNameStrings("application")
        await httpPollingProtocol.startTask();
        let a = new A();
        console.log(a.getName())

    });
});
