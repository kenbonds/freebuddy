import axios from "axios";
import type { AxiosRequestConfig } from "axios";

const service = axios.create({
  baseURL: "/api",
  timeout: 90000,
  headers: {
    "Content-Type": "application/json"
  }
});

// 响应拦截器统一拆解返回体
service.interceptors.response.use(
  (resp) => resp.data,
  (err) => Promise.reject(err)
);

// 重新定义类型以使 TypeScript 类型匹配拦截器行为（返回 Promise<T> 而非 Promise<AxiosResponse<T>>）
interface CustomRequest {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T>;
  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
  delete<T>(url: string, config?: AxiosRequestConfig): Promise<T>;
  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
}

const request = service as unknown as CustomRequest;
export default request;
