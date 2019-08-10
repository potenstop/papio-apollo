/**
 *
 * 功能描述:
 *
 * @className Value
 * @projectName papio-apollo
 * @author yanshaowen
 * @date 2019/8/8 12:52
 */
import "reflect-metadata";
import {ConvertUtil} from "../util/ConvertUtil";
import {GlobalEnum} from "../enum/GlobalEnum";

export function Value(value: string): CallableFunction {
    // 拦截属性的get方法
    return (target: (new () => object), propertyKey: string) => {
        const functionName = "get" + ConvertUtil.toFirstUpperCase(propertyKey);
        // @ts-ignore
        if (target[functionName] instanceof Function) {
            // getValueByKey(value);
            // @ts-ignore
            target[functionName] = function() {
                return getValueByKey(target, value, propertyKey);
            };
        } else {
            throw new Error(`papio-apollo not found get function , key:${propertyKey} functionName:${functionName}`);
        }
    };
}
function getValueByKey(target: (new () => object), key: string, propertyKey: string): string {
    // @ts-ignore
    const papioApplication = global[GlobalEnum.PAPIO_APPLICATION];
    if (!papioApplication.has(key)) {
        throw new Error(`papio-apollo not found apollo configKey:${key}`);
    } else {
        const value = papioApplication.get(key);
        const typeName = Reflect.getMetadata("design:type", target, propertyKey);
        if (typeName === String || typeName === Boolean || typeName === Number) {
            return typeName(value);
        } else {
            throw new Error(`papio-apollo property:${propertyKey} type error. must String or Number or Boolean`);
        }
    }
}
