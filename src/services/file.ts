/**
 * 获取 public 目录下的文件内容
 * @param path
 */
export async function getFileContent(path: string) {
  const response = await fetch(`/${path}`);
  const data = await response.text();
  return {
    code: 0,
    data,
  };
}
