/**
 *
 * 功能描述: 枚举类的相关工具类
 *
 * @className EnumUtil
 * @projectName papio
 * @author yanshaowen
 * @date 2019/2/13 20:36
 */
export class EnumUtil {
    /**
     * 方法功能描述: 把value值转换为枚举类型
     * @author yanshaowen
     * @date 2019/2/13 20:42
     * @param enumClazz
     * @param value
     * @return
     */
    public static getValueEnum<T>(enumClazz: T, value: any): any {
        if (value in enumClazz) {
            return value as T;
        } else {
            for (const key of Object.keys(enumClazz)) {
                if (enumClazz[key] === value) {
                    return value as T;
                }
            }
        }
        return null;
    }
}
