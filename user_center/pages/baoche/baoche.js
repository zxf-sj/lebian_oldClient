// user_center/pages/baoche/baoche.js
const BASE_URL = require("../../../utils/BASE_URL");
var baseUrl = BASE_URL.BASE_URL //配置基础url
import http from '../../../utils/http.js';
const debounce = require('../../../utils/debounce');
const app = getApp();
const throttle = require('../../../utils/throttle.js').throttle;
const unionPayWatcher = require('../../../utils/unionPayWatcher.js');
Page({

  /**
   * 页面的初始数据
   */
  data: {
    distanceNav_Data:'',//出行日期、时间子->父->子传值
    carTypeList:[],//车型列表
    rangfenceMapList:[],//超范围列表
    price:"",//总价
    initialPrice: '', //初始票价
    baseUrl:'',
    version: 0,
    carType: 0, //车型选中下标
    textareaValue:"",//备注信息
    phone_number:'',
    // ===== 底部支付方式弹框 =====
    paySheetShow: false, //支付方式弹框显隐
    payType: 'union', //当前选中支付方式：union=云闪付（默认） wechat=微信
    paySheetPhone: '', //弹框展示的手机号
    payTypeList: [{
        key: 'union',
        name: '云闪付支付',
        tip: '选择云闪付支付随机立减',
        tag: ''
      },
      {
        key: 'wechat',
        name: '微信支付',
        tip: '',
        tag: ''
      }
    ],
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
   //获取用户须知
   this.getNews()
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    unionPayWatcher.start(); // 兜底：冷启动后仍有待确认的云闪付订单时恢复监听
    this.setData({
      baseUrl:baseUrl
    })
  },
  //手机号
  person_phone: debounce(function (res) {
    let _this = this
    let phone_number = res.detail.value;
    // const reg = /^1[3-9]\d{9}$/;
    // let isphone = reg.test(phone_number);
    // if(isphone) {
      _this.setData({
        phone_number
      })
    // } else {
    //   wx.showToast({
    //     title: '请输入正确的手机号',
    //     icon: 'error',
    //     duration: 2000
    //   })
    // }
  }, 500),
  information_phone_number(e) {
    console.log(e.detail)
    this.setData({
      phone_number:e.detail
    })
  },
  //获取车辆列表
  getCarList() {
    console.log('????????????')
    let that = this
    var userinfo = wx.getStorageSync('userInfo');
    let starInfo2 = wx.getStorageSync('starInfo2')
    let endInfo2 = wx.getStorageSync('endInfo2')
    var storageSync = wx.getStorageSync('storageSync')
    var startDate = storageSync.startDate;
    var pcTimeSync = wx.getStorageSync('pcTimeSync')
    let starTime = pcTimeSync.StartTime.split(':')[0] + ':59:00'
    let ArrivalTime = startDate + ' ' + starTime
    var data = {
      IsExclusive: '100004-0000010001',
      Id: storageSync.lineId,
      StartLat: starInfo2.startLait,
      StartLng: starInfo2.startLont,
      EndLat: endInfo2.endLait,
      EndLng: endInfo2.endLont,
      ArrivalTime: ArrivalTime,
      MemberId: userinfo.Id,
      AdultNumber: 1,
    };
    console.log("shijin",pcTimeSync.StartTime)
    if (storageSync.lineId && pcTimeSync.StartTime) {
      http.postRequest('/Api/DispatchMobile/getPriceListForLineId', data, '', (res) => {
        if (res.code == '0') {
          //这里是默认值  默认选中第一辆车
          let data = res.data[0];
          // if(!data.CarSeatState) {
          //   data = res.data[1]
          //   that.setData({
          //     carType:1
          //   })
          // }
          wx.setStorageSync('pcTypeId', data.Id)
          // if (data.CarSeatState) {
            //默认价格 
            let price = 0
          console.log(res.data)
              price = data.Price + Number(data.Version)
            that.setData({
              rangfenceMapList: data.rangfenceMapList, //超范围列表
              carTypeList: res.data, //车型列表
              price, //总价
              initialPrice: data.Price, //初始票价
              version: Number(data.Version)
            })
          // } else {
          //   wx.showToast({
          //     title: 'CarSeatState : false',
          //     icon: 'error',
          //     duration: 2000
          //   })
          // }
        }
      }, (err) => {
        console.log(err)
      })
    }
  },
  //点击车型
  chooseCarType(e) {
    let that = this;
    let index = e.currentTarget.dataset.index;
    let data = that.data.carTypeList[index]
    wx.setStorageSync('pcTypeId', data.Id)
    // if (data.CarSeatState) {
      //默认价格 
      let price = data.Price + Number(data.Version)
      that.setData({
        rangfenceMapList: data.rangfenceMapList, //超范围列表
        price, //总价
        carType: index, //车型选中下标
        version: Number(data.Version),
      })
    // } else {
    //   wx.showToast({
    //     title: 'CarSeatState : false',
    //     icon: 'error',
    //     duration: 2000
    //   })
    // }
  },
  handletel() {
    let _this = this;
    if (_this.data.phone_number == '') {
      wx.showToast({
        title: '请填写联系方式',
        icon: 'none',
        duration: 2000
      })
      return false;
    } else {
      const reg = /^1[3-9]\d{9}$/;
      let isphone = reg.test(_this.data.phone_number);
      if (!isphone) {
        wx.showToast({
          title: '请输入正确的手机号',
          icon: 'error',
          duration: 2000
        })
        return false;
      } else {
        // 手机号校验通过后，弹出底部支付方式选择框（替代原“请确认手机号”弹窗）
        _this.setData({
          paySheetShow: true,
          paySheetPhone: _this.data.phone_number
        })
      }
    }

  },
  // 底部支付方式弹框：切换支付方式
  onPayTypeChange(e) {
    this.setData({
      payType: e.currentTarget.dataset.key
    })
  },
  // 底部支付方式弹框：取消
  cancelPaySheet() {
    this.setData({
      paySheetShow: false
    })
  },
  // 阻止弹框内部滚动穿透
  noop() {},
  // 底部支付方式弹框：确认
  confirmPaySheet() {
    let _this = this;
    const payType = _this.data.payType;
    _this.setData({
      paySheetShow: false
    });
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0'); // 获取小时并补零
    const minutes = String(now.getMinutes()).padStart(2, '0'); // 获取分钟并补零
    const formattedTime = `${hours}:${minutes}`;
    let pcTimeSync = wx.getStorageSync('pcTimeSync')
    console.log(formattedTime, pcTimeSync.StartTime)
    let timeNode = _this.isTimeInRange(formattedTime, pcTimeSync.StartTime)
    console.log(timeNode)
    if (timeNode) {
      _this.callCar(payType)
    } else {
      wx.showModal({
        title: '提示',
        content: '尊敬的乘客：距离发车时间较近，车辆调度资源紧张，为保证乘车体验，发车时间将最优安排至下单1个小时内的最快发车时段，请知悉。咨询热线：0351-6078977 感谢您的理解与耐心等候！',
        success(res) {
          if (res.confirm) {
            console.log('用户点击确定')
            _this.callCar(payType)
          } else if (res.cancel) {
            console.log('用户点击取消')
          }
        }
      })
    }
  },
  // ===== 支付流程公共状态与工具 =====
  _payBusy: false, //下单/支付流程进行中，忽略重复点击，避免产生多笔订单
  _showPayLoading() {
    wx.showLoading({
      title: this.data.dispatchListId ? '车辆调度中' : '加载中...',
      mask: true
    });
  },
  // 流程终止（失败/取消）统一收尾：关 loading 并释放提交锁
  _finishPayFlow() {
    this._payBusy = false;
    wx.hideLoading();
  },
  // 下单成功后清理行程草稿缓存，避免下次进入页面残留上一次的选择
  _clearOrderDraft() {
    ['starInfo2', 'endInfo2', 'storageSync', 'pcTimeSync', 'personNum', 'pcTypeId', 'textareaValue', 'phoneStr', 'lineId'].forEach(function (key) {
      wx.removeStorageSync(key);
    });
  },
  _goPayDetail(orderId) {
    wx.reLaunch({
      url: '/user_center/pages/payDetail/payDetail?orderId=' + orderId + '&from=orderList'
    });
  },
  // 云闪付支付逻辑：跳转云闪付小程序，返回后经 onAppShow(1038) 查询订单支付状态
  _handleUnionPay(orderId, memberInfoId) {
    console.log(orderId, memberInfoId)
    let that = this;
    let appid = wx.getStorageSync('appId');
    http.getRequest('/Api/DispatchMobile/GoUnionPay?appid=' + appid + '&Id=' + orderId + '&MemberInfoId=' + memberInfoId + "&PaymentType=2", "", wx.getStorageSync('header'), (res) => {
      console.log(res);
      if (res.code != 0) {
        that._finishPayFlow();
        wx.showToast({
          title: res.msg || '获取支付信息失败，请稍后重试',
          icon: 'none',
          duration: 2000
        });
        return;
      }
      that._finishPayFlow();
      let payData = res.data || {};
      // 记录待确认订单并注册 onAppShow 监听，用户从云闪付返回后查询支付结果
      unionPayWatcher.mark(orderId, 'dispatch');
      wx.navigateToMiniProgram({
        appId: payData.CqpMpAppId,
        path: payData.CqpMpPath,
        fail(err) {
          console.log('打开云闪付失败', err);
          unionPayWatcher.clear();
          wx.showModal({
            title: '提示',
            content: '无法打开云闪付，可稍后在订单页继续支付。',
            confirmText: '查看订单',
            cancelText: '知道了',
            success(r) {
              if (r.confirm) that._goPayDetail(orderId);
            }
          });
        }
      });
    }, (err) => {
      console.log(err);
      that._finishPayFlow();
      wx.showToast({
        title: '获取支付信息失败，请稍后重试',
        icon: 'none',
        duration: 2000
      });
    });
  },
  // 换取支付参数并唤起微信收银台（原两条分支中的重复实现收敛到这里）
  _launchWechatPay(orderId, memberInfoId) {
    console.log(orderId, memberInfoId)
    let that = this;
    let appid = wx.getStorageSync('appId');
    http.getRequest('/Api/DispatchMobile/GoUnionPay?appid=' + appid + '&Id=' + orderId + '&MemberInfoId=' + memberInfoId + "&PaymentType=1", "", wx.getStorageSync('header'), (res) => {
      console.log(res);
      if (res.code != 0) {
        that._finishPayFlow();
        wx.showToast({
          title: res.msg || '获取支付信息失败，请稍后重试',
          icon: 'none',
          duration: 2000
        });
        return;
      }
      wx.hideLoading();
      let payData = res.data || {};
      console.log('拉起支付');
      wx.requestPayment({
        timeStamp: payData.TimeStamp,
        nonceStr: payData.NonceStr,
        package: payData.Package,
        signType: payData.SignType,
        paySign: payData.PaySign,
        success() {
          that._clearOrderDraft();
          wx.showToast({
            title: '支付成功',
            icon: 'success',
            duration: 2000,
            success: function () {
              that.setSubscribeMessage();
              setTimeout(function () {
                that._goPayDetail(orderId);
              }, 1000);
            }
          });
        },
        // 支付失败或用户取消：订单已创建，引导到详情页继续支付，避免丢单
        fail(err) {
          console.log('拉起支付失败', err);
          that._finishPayFlow();
          setTimeout(function () {
            that._goPayDetail(orderId);
          }, 1000);
        }
      });
    }, (err) => {
      console.log(err);
      that._finishPayFlow();
      wx.showToast({
        title: '获取支付信息失败，请稍后重试',
        icon: 'none',
        duration: 2000
      });
    });
  },
  // 创建包车订单：无历史订单与“继续下单”两条入口共用
  _createOrder(reqData, memberInfoId) {
    console.log(reqData, memberInfoId)
    let that = this;
    that._showPayLoading();
    wx.request({
      url: baseUrl + '/Api/DispatchMobile/CreatePersonTicketOrder',
      data: reqData,
      method: 'POST',
      success(res) {
        console.log(res)
        let ress = res.data
        if (ress.code != '0' || !ress.data) {
          that._finishPayFlow();
          wx.showToast({
            title: ress.msg || '下单失败，请稍后重试',
            icon: 'none',
            duration: 2000
          });
          return;
        }
        let orderId = ress.data.Id;
        console.log(orderId)
        // 按弹框所选支付方式分流：union=云闪付（占位） wechat=微信（原逻辑）
        if (that.data.payType === 'union') {
          that._finishPayFlow();
          console.log(orderId)
          that._handleUnionPay(orderId,memberInfoId);
          return;
        }
        console.log(orderId, memberInfoId)
        that._launchWechatPay(orderId, memberInfoId);
      },
      // 原实现缺失 fail 回调，网络异常时会一直卡在 loading
      fail(err) {
        console.log('下单请求失败', err);
        that._finishPayFlow();
        wx.showToast({
          title: '网络异常，请稍后重试',
          icon: 'none',
          duration: 2000
        });
      }
    });
  },
  // 当日已有订单：列出历史订单，由用户选择取消下单或继续下单
  _showDayOrderModal(list, onContinue) {
    let that = this;
    let str = '';
    (list || []).forEach(function (item) {
      str += item.PassengerLineId_Name + ',' + '订单号为:' + item.Code + '\n';
    });
    wx.showModal({
      title: '下单记录',
      content: str,
      cancelText: '取消下单',
      confirmText: '继续下单',
      complete: (res) => {
        if (res.confirm) {
          onContinue();
        } else {
          that._finishPayFlow();
          if (res.cancel) {
            wx.navigateTo({
              url: '/pages/index/index',
            });
          }
        }
      }
    });
  },
 
 isTimeInRange(currentTime, selectedTime) {
  const [curH, curM] = currentTime.split(':').map(Number);
  const [selH, selM] = selectedTime.split(':').map(Number);
  if (curH === selH && curM >= 45) {
    return false; 
  }
  // 其他所有情况都返回 true
  return true; 
},
  // 叫车（下单 + 支付入口）
  callCar: throttle(function (payType) {
    let _this = this;
    if (_this._payBusy) {
      return false; // 上一次下单/支付尚未结束，忽略重复点击，防止重复下单
    }
    if (payType) _this.setData({
      payType: payType
    });
    _this._payBusy = true;

    let openid = wx.getStorageSync('openid');
    if (!openid) {
      _this._finishPayFlow();
      wx.navigateTo({
        url: '/user_center/pages/login/login',
      });
      return false;
    }
    let user = wx.getStorageSync('userInfo') || {};
    console.log(user)
    let startInfo = wx.getStorageSync('starInfo2') || {};
    let endInfo = wx.getStorageSync('endInfo2') || {};
    let storageSync = wx.getStorageSync('storageSync') || {};
    let pcTimeSync = wx.getStorageSync('pcTimeSync') || {};
    let pcTypeId = wx.getStorageSync('pcTypeId');
    let startDate = storageSync.startDate;

    // 参数校验集中处理，命中即提示并释放提交锁
    let invalidMsg = (!startInfo.startAddress && '请选择出发乘车位置') ||
      (!endInfo.endAddress && '请选择下车位置') ||
      (!_this.data.phone_number && '请填写联系方式') ||
      (!pcTimeSync.StartTime && '请选择出发时间');
    if (invalidMsg) {
      _this._finishPayFlow();
      wx.showToast({
        title: invalidMsg,
        icon: 'none',
        duration: 2000
      });
      return false;
    }

    let starTime = pcTimeSync.StartTime.split(':')[0] + ':59:00';
    let ArrivalTime = startDate + ' ' + starTime;
    let reqData = {
      PassengerLineId: storageSync.lineId,
      IntoLocation: startInfo.startAddress,
      IntoLongitude: startInfo.startLont,
      IntoLatitude: startInfo.startLait,
      OffLocation: endInfo.endAddress,
      OffLongitude: endInfo.endLont,
      OffLatitude: endInfo.endLait,
      Departure: "100004-0000980002",
      ArrivalTime: ArrivalTime,
      Personal: user.Id,
      DispatchListId: "",
      IsReservation: "100004-0000010002",
      CouponDetailsId: pcTimeSync.hasChooseId ? pcTimeSync.hasChooseId : "",
      PersonalIds: _this.data.phone_number,
      Note: _this.data.textareaValue,
      IsExclusive: "100004-0000010001",
      IsPickGoods: '100004-0000010002',
      SelectCarType: pcTypeId,
      OrderSource: "小程序",
      priceType: '100004-0001270001',
      AdultNumber: 1, //成人数
      ChildNum: 0, //儿童数
    };

    // 先查该手机号当日是否已有订单，再决定直接下单还是让用户确认
    http.getRequest('/Api/DispatchMobile/IsUserHaveDayOrder?phone=' + _this.data.phone_number + '&timeDay=' + startDate, '', '', (res) => {
      if (res.code != 0) {
        _this._finishPayFlow();
        wx.showToast({
          title: '数据请求失败，请稍后重试',
          icon: 'none',
          duration: 2000
        });
        return;
      }
      console.log(user.Id)
      if (!res.count) {
        _this._createOrder(reqData, user.Id);
      } else {
        _this._showDayOrderModal(res.data, function () {
          _this._createOrder(reqData, user.Id);
        });
      }
    }, (err) => {
      console.log(err);
      _this._finishPayFlow();
      wx.showToast({
        title: '数据请求失败，请稍后重试',
        icon: 'none',
        duration: 2000
      });
    });
  }, 5000),
  setSubscribeMessage:function(){
    wx.showModal({
      title: '提示',
      content: '即将为您开启消息提醒',
      complete: (res) => {
        if (res.confirm) {
          wx.requestSubscribeMessage({
            tmplIds: ['deEFYI36UL3YupVO80D_0yKwFT_Q2NPV-VpYqGhn9DA',"LhKVmpSKt-FGzwYVDHB6UQpVrdZmMklLzcFJ6Ln_oJU"],
            success(res) {
              if (res['deEFYI36UL3YupVO80D_0yKwFT_Q2NPV-VpYqGhn9DA'] === 'accept') {
                console.log('用户同意接收订阅消息');
              } else {
                wx.showModal({
                  title: '订阅消息',
                  content: '您当前拒绝接受消息通知，是否去开启',
                  confirmText: '开启授权',
                  confirmColor: '#345391',
                  cancelText: '仍然拒绝',
                  cancelColor: '#999999',
                  success(res) {
                    if (res.confirm) {
                      wx.openSetting({
                        success(res) {
                          console.log(res.authSetting);
                        },
                        fail(err) {
                          //失败
                          console.log(err);
                        }
                      });
                    } else if (res.cancel) {
                      console.log('用户点击取消');
                    }
                  }
                });
              }
            },
            fail(err) {
              console.log('请求订阅消息权限失败：', err);
            }
          });
        }
       
      }
    })
  },
  //information 组件 triggerEvent 传值 
  updatedData(e) {
    console.log(e.detail)
    const newData = e.detail; 
    this.setData({
      distanceNav_Data: newData
    });
    //拉车型列表
    this.getCarList()
  },
   //点击备注信息
   handleRemarks() {
    this.setData({
      remark: true
    })
  },
  //备注信息传值
  handleTextareaValue(res) {
    this.setData({
      textareaValue: res.detail
    })
  },
   //用户须知
   showView() {
    let that = this;
    that.setData({
      isshow: true
    })
  },
  //用户须知__同意
  tongyi() {
    let that = this;
    that.setData({
      agree: true,
      isshow: false
    })
  },
  //用户须知__取消
  guanbi() {
    let that = this;
    that.setData({
      isshow: false,
      agree: false
    })
  },
  //获取用户须知
  getNews() {
    let that = this;
    http.postRequest("/Api/DispatchMobile/NewGetXcx?ShortCode=Car", "", wx.getStorageSync('header'), res => {
      if (res.code == 0) {
        let content = res.data.Content;
        const WxParses = require('../wxParse/wxParse');
        WxParses.setImageDomain(BASE_URL);
        WxParses.wxParse('content', 'html', content, that, 5);
      }
    }, err => {
      console.log(err)
    })
  },
  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  }
})