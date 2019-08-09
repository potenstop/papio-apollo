import {expect} from "chai";
import {Value} from "../../src/annotation/Value";
import {HttpPollingProtocol} from "../../src/protocol/HttpPollingProtocol";

class A {
    @Value("server.port")
    private name: string;

    public getName(): string {
        return this.name;
    }
}
describe("测试", () => {
    it("value", async () => {

        let httpPollingProtocol = new HttpPollingProtocol();
        httpPollingProtocol.setAppId("web-api");
        httpPollingProtocol.setMetaAddress("http://local-meta.potens.top");
        httpPollingProtocol.setNamespaceNameStrings("application,fx.config,web.connection")
        await httpPollingProtocol.startTask();
        let a = new A();
        console.log(a.getName())

    });
});
