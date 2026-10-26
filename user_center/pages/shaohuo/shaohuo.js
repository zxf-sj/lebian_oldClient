// user_center/pages/shaohuo/shaohuo.js
const throttle = require('../../../utils/throttle.js').throttle;
const unionPayWatcher = require('../../../utils/unionPayWatcher.js');
const BASE_URL = require("../../../utils/BASE_URL");
var baseUrl = BASE_URL.BASE_URL //配置基础url
const debounce = require('../../../utils/debounce');
import http from '../../../utils/http.js';
const fs = wx.getFileSystemManager();
const CHUNK_SIZE = 1.5 * 1024 * 1024; // 1.5MB 原始数据（Base64 后约 2MB）
const UPLOAD_API = baseUrl + '/Api/UploadMobile/ImageChunk'; // 你的分片接口

Page({

  /**
   * 页面的初始数据
   */
  data: {
    uploadedUrls: [], // [{ url: 'https://...' }]
    // --------------
    sendMailPhone: '', //寄件联系方式
    sendMailName: '',
    pickUpPhone: '', //取件联系方式
    pickUpName: '',
    belongings: '', //物品名称
    imgUrl: [], //物品照片地址
    remark: false,
    textareaValue: '',
    distanceNav_Data: '', //寄件日期、时间子->父->子传值
    showPreview: false,
    currentImage: '',
    currentIndex: -1,
    price: '',
    sharedData: [],
    rangfenceMapList: [],
    Version: '',
    PayAmount: '',
    newinformationId: '',
    DeliveryType: "",
    mrPrice:'',
    jisuan:'',
    num:11,
    // ===== 底部支付方式弹框 =====
    paySheetShow: false, //支付方式弹框显隐
    paySheetConfirmed: false, //弹框确认标记（一次性）
    payType: 'union', //当前选中支付方式：union=云闪付（默认） wechat=微信
    paySheetPhone: '', //弹框展示的手机号
    payPromoDetailShow: false, //支付立减优惠详情是否展开
    payPromoRules: [
      '满5元立减1元',
      '满10元立减2元',
      '满50元立减10元',
      '满100元立减20元'
    ], //支付立减优惠规则
    payTypeList: [{
        img: '/assets/images/yunshanfu.png',
        key: 'union',
        name: '云闪付支付',
        tip: '选择云闪付支付随机立减',
        tag: ''
      },
      {
        img: '/assets/images/wechat.png',
        key: 'wechat',
        name: '微信支付',
        tip: '',
        tag: ''
      }
    ]
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {

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
    // if(wx.getStorageSync('mapBack')) {
    //   wx.removeStorageSync('mapBack')
    // } else {
    //   wx.removeStorageSync('starInfo2')
    //   wx.removeStorageSync('endInfo2')
    // }
  },
  sendMsg() {
    this.setData({
      jisuan:'jisuan'
    })
  },
  sendToParent2(e) {
    console.log(e)
    let a = e.detail.newinformationList.filter(item => item.checked == true)
    let b = e.detail.newremarkList.filter(item => item.checked == true)
    console.log(a,b)
    let mrPrice = {
      a:a.length>0?a[0].Price:'',
      b:b.length>0?b[0].Price:''
    }
    console.log(a)
    console.log(b)
    wx.setStorageSync('mrPrice', mrPrice)
    this.setData({
      sharedData: e.detail.newremarkList,
      newinformationId: a[0].Id,
      DeliveryType: b[0].Id,
    })
  },
  goods(e) {
    console.log(e.detail)
    let mrPrice = wx.getStorageSync('mrPrice')
    let updatedData = {
      ...mrPrice,
      a:e.detail[0].Price
    };
    wx.setStorageSync('mrPrice', updatedData)
    this.setData({
      newinformationId: e.detail[0].Id,
      jisuan:this.data.num++
    })
  },
  onRadioChange(e) {
    console.log(this.data.sharedData)
    let items = this.data.sharedData.filter(item => item.Id == e.detail.value)
    let mrPrice = wx.getStorageSync('mrPrice')
    let updatedData = {
      ...mrPrice,
      b:items[0].Price
    };
    wx.setStorageSync('mrPrice', updatedData)
    this.setData({
      DeliveryType: e.detail.value,
      jisuan:this.data.num++,
    })
  },
  handleFromA(e) {
    const data = e.detail;
    let newinformation = data.newinformationList.filter(item => item.checked == true)
    let newremarkId = data.newremarkList.filter(item => item.checked == true)
   
    this.setData({
      DeliveryType: newremarkId.length>0?newremarkId[0].Id:'',
      newinformationId: newinformation.length>0?newinformation[0].Id:'',
      sharedData: data.newremarkList,
      sendMailPhone: data.DeliverGoodsTel,
      pickUpPhone: data.TakeOverGoodsTel,
      rangfenceMapList: data.newremarkList[0].rangfenceMapList,
      Version: data.newremarkList[0].Version,
      PayAmount: data.PayAmount
    });
  },
  //------这里是上传组件
  // 1. 选择图片并自动上传
  async chooseAndUpload() {
    let that = this;
    if (that.data.uploadedUrls.length < 3) {
      try {
        // wx.chooseImage
        const {
          tempFilePaths
        } = await wx.chooseImage({
          count: 3 - that.data.uploadedUrls.length,
          sizeType: ['compressed'], // 压缩图
          sourceType: ['album', 'camera']
        });
        wx.showLoading({
          title: '上传中...',
          mask: true
        });
        const urls = [];
        // 串行上传（避免内存溢出）
        for (const path of tempFilePaths) {
          try {
            const url = await that.uploadFileChunked(path);
            console.log(url)
            urls.push(baseUrl + url.data);
          } catch (err) {
            wx.showToast({
              title: '部分上传失败',
              icon: 'none'
            });
            console.error('Upload failed:', err);
          }
        }
        console.log(urls)
        that.setData({
          uploadedUrls: [...that.data.uploadedUrls, ...urls]
        });
        wx.hideLoading();
        wx.showToast({
          title: '上传完成'
        });
      } catch (err) {
        wx.hideLoading();
        wx.showToast({
          title: '选择取消或失败',
          icon: 'none'
        });
      }
    } else {
      wx.showToast({
        title: '最多上传三张图片',
        icon: 'none'
      });
    }

  },
  // 2. 分片上传单个文件
  uploadFileChunked(filePath) {
    return new Promise((resolve, reject) => {
      fs.readFile({
        filePath,
        success: ({
          data: arrayBuffer
        }) => {
          const totalSize = arrayBuffer.byteLength;
          const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);
          const fileId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
          let uploadedCount = 0;
          // 上传每个分片
          for (let i = 0; i < totalChunks; i++) {
            const start = i * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, totalSize);
            const chunk = arrayBuffer.slice(start, end);
            const base64 = wx.arrayBufferToBase64(chunk);
            wx.request({
              url: UPLOAD_API,
              method: 'POST',
              data: {
                FileKey: fileId, // 文件唯一 ID
                ChunkIndex: i, // 当前分片索引（从 0 开始）
                ChunkCount: totalChunks, // 总分片数
                ChunkData: base64 // Base64 字符串
              },
              timeout: 30000,
              success: res => {
                if (res.statusCode !== 200) {
                  return reject(new Error(`分片 ${i} 失败: ${res.statusCode}`));
                }
                uploadedCount++;
                // 最后一片上传完成，应返回 { url: "..." }
                if (uploadedCount === totalChunks) {
                  const url = res.data;
                  // const url = result.url || result.data?.url;
                  if (url) resolve(url);
                  else reject(new Error('未返回有效 URL'));
                }
              },
              fail: reject
            });
          }
        },
        fail: reject
      });
    });
  },
  //点击图片查看
  previewImage(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      currentImage: this.data.uploadedUrls[index],
      currentIndex: index,
      showPreview: true
    });
  },
  //关闭查看图片
  closePreview() {
    this.setData({
      showPreview: false
    });
  },
  //删除图片
  deleteImage() {
    const {
      currentIndex,
      uploadedUrls
    } = this.data;
    wx.showModal({
      title: '提示',
      content: '确定要删除这张图片吗？',
      success: (res) => {
        if (res.confirm) {
          const newList = [...uploadedUrls];
          newList.splice(currentIndex, 1);
          this.setData({
            uploadedUrls: newList,
            showPreview: false
          });
          // 可选：调用接口删除服务器图片
        }
      }
    });
  },
  //----上面是上传组件
  //寄件联系方式填写
  sendMailInput:debounce(function(e) {
    let _this = this
    let phone_number = e.detail.value
    console.log(phone_number)
    const reg = /^1[3-9]\d{9}$/;
    let isphone = reg.test(phone_number);
    if(isphone) {
      _this.setData({
        sendMailPhone:phone_number
      })
    } else {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'error',
        duration: 2000
      })
    }
    
  },500),
  sendMailName(e) {
    this.setData({
      sendMailName: e.detail.value
    })
  },
  pickUpInput:debounce(function(e) {
    let _this = this
    let phone_number = e.detail.value
    console.log(phone_number)
    const reg = /^1[3-9]\d{9}$/;
    let isphone = reg.test(phone_number);
    if(isphone) {
      _this.setData({
        pickUpPhone:phone_number
      })
    } else {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'error',
        duration: 2000
      })
    }
    
  },500),
  pickUpName(e) {
    this.setData({
      pickUpName: e.detail.value
    })
  },
  //去下单
  handleCallCar: throttle(function (e) {
    // 点击确认下单：先弹出底部支付方式选择框
    if (!this.data.paySheetShow) {
      this.setData({
        paySheetShow: true,
        paySheetPhone: this.data.pickUpPhone || this.data.sendMailPhone || ''
      })
    }
  }, 5000),
  // 底部支付方式弹框：展开/收起支付立减优惠详情
  togglePayPromoDetail() {
    this.setData({
      payPromoDetailShow: !this.data.payPromoDetailShow
    })
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
  // 底部支付方式弹框：确认下单
  confirmPaySheet() {
    this.setData({
      paySheetShow: false
    })
    this._doHandleCallCar()
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
  // 支付成功后清理草稿缓存，避免下次进入页面残留上一次的选择
  _clearOrderDraft() {
    ['starInfo2', 'endInfo2', 'storageSync', 'passengerList', 'pcTimeSync', 'personNum', 'pcTypeId', 'SeatNumber', 'textareaValue', 'lineId'].forEach(function (key) {
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
  // 创建取送货物订单：无历史订单与“继续下单”两条入口共用
  _createOrder(reqData, memberInfoId) {
    let that = this;
    that._showPayLoading();
    wx.request({
      url: baseUrl + '/Api/DispatchMobile/CreateBringGoodsOrder',
      data: reqData,
      method: 'POST',
      success(res) {
        let ress = (res && res.data) || {};
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
        // 按弹框所选支付方式分流：union=云闪付（占位） wechat=微信（原逻辑）
        if (that.data.payType === 'union') {
          that._finishPayFlow();
          that._handleUnionPay(orderId, memberInfoId);
          return;
        }
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
  // 下单与支付入口（校验 + 组装参数 + 查当日历史订单）
  _doHandleCallCar: throttle(function () {
    let that = this;
    if (that._payBusy) {
      return false; // 上一次下单/支付尚未结束，忽略重复点击，防止重复下单
    }
    that._payBusy = true;

    var openid = wx.getStorageSync('openid');
    if (!openid) {
      that._finishPayFlow();
      wx.navigateTo({
        url: '/user_center/pages/login/login',
      });
      return false;
    }
    var user = wx.getStorageSync('userInfo') || {};
    var startInfo = wx.getStorageSync('starInfo2') || {};
    var endInfo = wx.getStorageSync('endInfo2') || {};
    var storageSync = wx.getStorageSync('storageSync') || {};
    var note = wx.getStorageSync('textareaValue');
    var startDate = storageSync.startDate;

    // 参数校验集中处理，命中即提示并释放提交锁
    var invalidMsg = (!startInfo.startAddress && '请选择出发乘车位置') ||
      (!endInfo.endAddress && '请选择下车位置') ||
      (!that.data.newinformationId && '请选择物品大小') ||
      (!that.data.sendMailPhone && '请输入寄件人联系方式') ||
      (!that.data.pickUpPhone && '请输入收件人联系方式');
    if (invalidMsg) {
      that._finishPayFlow();
      wx.showToast({
        title: invalidMsg,
        icon: 'none',
        duration: 2000
      });
      return false;
    }

    let pcTypeId = that.data.newinformationId; //物品规格Id
    let reqData = {
      PassengerLineId: storageSync.lineId,
      IntoLocation: startInfo.startAddress,
      IntoLongitude: startInfo.startLont,
      IntoLatitude: startInfo.startLait,
      OffLocation: endInfo.endAddress,
      OffLongitude: endInfo.endLont,
      OffLatitude: endInfo.endLait,
      PassengerNumber: 1,
      Departure: "100004-0000980002",
      Personal: user.Id,
      SeatNumber: '',
      IsReservation: "100004-0000010002",
      Note: note,
      IsExclusive: "100004-0000010001",
      IsPickGoods: '100004-0000010001',
      SelectCarType: pcTypeId,
      OrderSource: "小程序",
      priceType: '100004-0001270001',
      DeliverGoodsTel: that.data.sendMailPhone,
      DeliverGoodsName: that.data.sendMailName,
      TakeOverGoodsTel: that.data.pickUpPhone,
      TakeOverGoodsName: that.data.pickUpName,
      GoodsSize: that.data.belongings,
      ImgList: that.data.uploadedUrls,
      DeliveryType: that.data.DeliveryType
    };
    let phoneStr = that.data.sendMailPhone + '|' + that.data.sendMailName + ',' + that.data.pickUpPhone + '|' + that.data.pickUpName;

    // 先查该联系方式当日是否已有订单，再决定直接下单还是让用户确认
    http.getRequest('/Api/DispatchMobile/IsUserHaveDayOrder?phone=' + phoneStr + '&timeDay=' + startDate, '', '', (res) => {
      if (res.code != 0) {
        that._finishPayFlow();
        wx.showToast({
          title: '数据请求失败，请稍后重试',
          icon: 'none',
          duration: 2000
        });
        return;
      }
      if (!res.count) {
        that._createOrder(reqData, user.Id);
      } else {
        that._showDayOrderModal(res.data, function () {
          that._createOrder(reqData, user.Id);
        });
      }
    }, (err) => {
      console.log(err);
      that._finishPayFlow();
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
  },

  belongingsInput(e) {
    this.setData({
      belongings: e.detail.value
    })
  },
  handleTextareaValue(e) {
    this.setData({
      textareaValue: e.detail
    })
  },
  handlejijian() {
    this.setData({
      remark: true
    })
  },
  shippingCost(e) {
    console.log(e)
    this.setData({
      price: e.detail
    })
  },
  //上传物品照片
  handleUpload(e) {
    // imgUrl
    const that = this;
    wx.chooseMedia({
      count: 5, // 默认9，设置图片的最大数量
      sizeType: ['original', 'compressed'], // 可以指定是原图还是压缩图，默认二者都有
      sourceType: ['album', 'camera'], // 可以指定来源是相册还是相机，默认二者都有
      success: function (res) {
        // 返回选定照片的本地文件路径列表，tempFilePath可以作为img标签的src属性显示图片
        that.setData({
          imgUrl: res.tempFiles // 将选择的图片路径设置到data中，用于显示
        });
        // 如果需要上传图片到服务器，可以使用res.tempFilePaths[0]作为参数进行上传
        // wx.uploadFile({
        //   url: '服务器地址', // 仅为示例，非真实的接口地址
        //   filePath: res.tempFilePaths[0],
        //   name: 'file', // 必须填，否则无法上传文件
        //   formData: {
        //     'user': 'test' // 其他表单参数
        //   },
        //   success(uploadRes) {
        //     console.log(uploadRes)
        //   }
        // })
      }
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

function cleanup(paths) {
  paths.forEach(p => {
    try {
      fs.unlinkSync(p);
    } catch (e) {}
  });
}