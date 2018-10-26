const constant = require('./constant.js');

/*
* params {url}  ajax的地址
* params {method}  ajax请求方式，默认get
* params {data}  ajax request参数
* params {isToken}  ajax是否要带自定义头部信息
*/
const ajax = (url = '', method = 'GET', data = '', isToken = true) => {
  return new Promise((resolve, reject) => {
    return getNetworkType().then()     //首先检查网络状态
      .then(res => { 
        return checkSession()     //检查session是否过期     
      })
      .then(res => {              //开始发送请求
        //如果需要头部信息，设置头部信息
        let header = {
          'content-type': 'application/json' // 默认值
        };
        if (isToken){    //需要验证token
          let token = storage.getItem('token');
          if (!token) {    //如果token不存在，重新登录拿token
            console.log('token不存在，应该怎么做？跳转到登录！');
            wx.navigateTo({
              url: '/pages/index/index',
            })
            reject();
          } else {
            wx.showLoading({
              title: '加载中...',
              mask: true
            });

            wx.request({
              url: constant.baseUrl + url,
              data: data,              //string/object/ArrayBuffer
              method: method,
              header: Object.assign(header, { token}),
              success(res) {
                resolve(res.data)
              },
              fail: reject,
              complete() {
                wx.hideLoading();
              }
            })
          }
        }else{    //不需要验证token，例如登录
          wx.showLoading({
            title: '加载中...',
            mask: true
          });
          wx.request({
            url: constant.baseUrl + url,
            data: data,              //string/object/ArrayBuffer
            method: method,
            header: header,
            success(res) {
              resolve(res.data)
            },
            fail: reject,
            complete() {
              wx.hideLoading();
            }
          })
        }
    })
    .catch((error) => {
      console.log(error)
      reject(error)
    })
    .done();
  })  
}

//我们可以提供一个done方法，总是处于回调链的尾端，保证抛出任何可能出现的错误。
Promise.prototype.done = function (onFulfilled, onRejected) {
  this.then(onFulfilled, onRejected)
    .catch(function (reason) {
      // 抛出一个全局错误
      setTimeout(() => { throw reason }, 0);
    });
};

//登录
function login(){
  wx.login({
    success(res) {
      if (res.code) {
        ajax('data.json', 'POST', {code:res.code}, false).then(response => {
          console.log('session过期，重新登录！')
        })
      } else {
        reject('登录失败！' + res.errMsg);
      }
    }
  })
}

//检查session有没有过期
function checkSession(){
  return new Promise((resolve, reject) => {
    wx.checkSession({
      success:resolve,  //session_key 未过期，并且在本生命周期一直有效
      fail(error) {     // session_key 已经失效，需要重新执行登录流程
        login();
        reject(error)
      }       
    })
  })
}

//涉及到某些授权行为
function getSetting(name){
  //可以通过 wx.getSetting 先查询一下用户是否授权了 "scope.record" 这个 scope
  return new Promise((resolve, reject) => {
    wx.getSetting({
      success(res) {
        let value = res.authSetting[`scope.${name}`];
        if (value == undefined){  //进入第一次开始授权
          wx.authorize({
            scope: `scope.${name}`,
            succes: resolve,
            fail: reject
          })
        }else if(value == false){    //已经授权了，但是取消了授权
          wx.showModal({
            title: '提示',
            content: '请同意授权后操作！',
            confirmText:'前往',
            success(res){
              if (res.confirm) {   //用户点击确定
                wx.openSetting({
                  success:resolve,
                  fail:reject
                })
              } else if (res.cancel) {   //用户点击了取消
                reject()
              }
            },
            fail:reject
          })
        }else{      //已经授权成功了
          resolve()
        }
      },
      fail(error) {
        wx.showToast({
          title: '获取授权失败',
          icon: 'none'
        })
        reject();
      }
    })
  })
}

//ajax首先判断有无网络
function getNetworkType(){
  return new Promise((resolve, reject) => {
    wx.getNetworkType({
      success: (res) => {
        if (res.networkType == 'none') {
          wx.showToast({
            title: '网络出现问题，请先检查网络！',
            icon: 'none'
          })
          reject(false)
        }else{
          resolve(true)
        }
      },
      fail: () => {
        wx.showToast({
          title: '网络检查失败，请先检查网络！',
          icon: 'none'
        })
        reject(false)
      }
    })
  })
}

//本地存储函数
const storage = {
  setItem(key, value){
    wx.setStorageSync(key, value)
  },
  getItem(key){
    return wx.getStorageSync(key)
  },
  removeItem(key){
    wx.removeStorageSync(key)
  },
  clear(){
    wx.clearStorage();
  }
}

module.exports = {
  ajax, 
  getSetting,
  checkSession,
  storage
}