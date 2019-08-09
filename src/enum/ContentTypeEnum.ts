/**
 *
 * 功能描述: 请求或相应的数据类型枚举类
 *
 * @className ContentTypeEnum
 * @projectName papio
 * @author yanshaowen
 * @date 2019/1/4 11:25
 */
export enum ContentTypeEnum {
    // text
    TEXT = "text/*",
    // HTML格式
    TEXT_HTML = "text/html",
    // 纯文本格式
    TEXT_PLAIN = "text/plain",
    // XML格式
    TEXT_XML = "text/xml",
    // image
    IMAGE = "image/*",
    // gif图片格式
    IMAGE_GIF = "image/gif",
    // jpg图片格式
    IMAGE_JPEG = "image/jpeg",
    // png图片格式
    IMAGE_PNG = "image/png",
    // application
    APPLICATION = "application/*",
    // XHTML格式
    APPLICATION_XHTML = "application/xhtml+xml",
    // XML数据格式
    APPLICATION_XML = "application/xml",
    // Atom XML聚合格式
    APPLICATION_ATOM = "application/atom+xml",
    // json格式
    APPLICATION_JSON = "application/json",
    // pdf格式
    APPLICATION_PDF = "application/pdf",
    // word格式
    APPLICATION_MSWORD = "application/msword",
    // 二进制流数据（如常见的文件下载）
    APPLICATION_OCTET_STREAM = "application/octet-stream",
    // 二进制流数据（如常见的文件下载）
    APPLICATION_URLENCODED = "application/x-www-form-urlencoded",
    // multipart
    multipart = "multipart/*",
    // form-data
    MULTIPART_FORM_DATE = "multipart/form-data",
}
