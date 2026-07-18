"use strict";
const electron = require("electron");
const api = {
  getAppVersion: () => electron.ipcRenderer.invoke("desktop:getAppVersion"),
  getPlatform: () => electron.ipcRenderer.invoke("desktop:getPlatform"),
  erpnextLogin: (input) => electron.ipcRenderer.invoke("erpnext:login", input),
  erpnextLogout: () => electron.ipcRenderer.invoke("erpnext:logout"),
  erpnextGetSession: () => electron.ipcRenderer.invoke("erpnext:getSession"),
  erpnextRequest: (input) => electron.ipcRenderer.invoke("erpnext:request", input)
};
electron.contextBridge.exposeInMainWorld("zatgoDesktop", api);
