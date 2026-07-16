import axios from "axios";
import type { ApiRes } from "../types/global";

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
  (err) => {
    return Promise.reject(err);
  }
);

export default service;
