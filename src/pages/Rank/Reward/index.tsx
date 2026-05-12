import { useState, useEffect, useRef, useCallback } from "react"
import {
  Card, Avatar, Statistic, Typography, Divider, Tooltip, Button,
  Modal, Spin, message, InputNumber, Input, Steps, Tag, Space, List, Badge
} from "antd"
import {
  CrownOutlined, RiseOutlined, HeartOutlined, GiftOutlined,
  TrophyOutlined, CheckCircleOutlined, LoadingOutlined, MobileOutlined,
  HistoryOutlined, ClockCircleOutlined
} from "@ant-design/icons"
import { listDonationVoByPageUsingPost } from "@/services/backend/donationRecordsController"
import { listDetailVoByPageUsingPost } from "@/services/backend/donationDetailRecordsController"
import { createPayOrderUsingPost, queryOrderUsingGet } from "@/services/backend/payOrderController"
import "./index.css"

const { Title, Text } = Typography
const { TextArea } = Input

// 预设金额选项
const PRESET_AMOUNTS = [1, 6.6, 9.9, 29.9, 66, 100]

// 轮询间隔（毫秒）
const POLL_INTERVAL = 3000
// 最大轮询次数（3秒 * 60次 = 3分钟超时）
const MAX_POLL_COUNT = 60

const DETAIL_PAGE_SIZE = 10

type PayStep = 'select' | 'qrcode' | 'success'

export default function DonationLeaderboard() {
  const [donors, setDonors] = useState<API.DonationRecordsVO[]>([])
  const [totalAmount, setTotalAmount] = useState(0)
  const [totalDonors, setTotalDonors] = useState<number>(0)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20
  const containerRef = useRef<HTMLDivElement>(null)

  // 详情记录状态
  const [details, setDetails] = useState<API.DonationDetailRecordsVO[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailPage, setDetailPage] = useState(1)
  const [detailTotal, setDetailTotal] = useState(0)

  // 支付相关状态
  const [payStep, setPayStep] = useState<PayStep>('select')
  const [selectedAmount, setSelectedAmount] = useState<number>(29.9)
  const [customAmount, setCustomAmount] = useState<number | null>(null)
  const [remark, setRemark] = useState('')
  const [payCreating, setPayCreating] = useState(false)
  const [payOrder, setPayOrder] = useState<API.PayOrderVO | null>(null)
  const [pollCount, setPollCount] = useState(0)
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent)

  // 获取打赏记录数据（榜单）
  const fetchDonationRecords = async (page: number, isLoadMore = false) => {
    if (loading) return
    setLoading(true)
    try {
      const response = await listDonationVoByPageUsingPost({
        current: page,
        pageSize: pageSize,
        sortField: 'amount',
        sortOrder: 'descend'
      })
      if (response.code === 0 && response.data) {
        const { records, total } = response.data
        if (isLoadMore) {
          setDonors(prev => [...prev, ...(records || [])])
          setTotalDonors(Number(total || 0))
          const newRecordsAmount = (records || []).reduce((sum, record) => sum + (record.amount || 0), 0)
          setTotalAmount(prev => Number((prev + newRecordsAmount).toFixed(2)))
        } else {
          setDonors(records || [])
          setTotalDonors(Number(total || 0))
          const total_ = (records || []).reduce((sum, record) => sum + (record.amount || 0), 0)
          setTotalAmount(Number(total_.toFixed(2)))
        }
        setHasMore((records || []).length === pageSize)
      } else {
        message.error('获取打赏记录失败')
      }
    } catch (error) {
      console.error('获取打赏记录出错:', error)
      message.error('获取打赏记录出错')
    } finally {
      setLoading(false)
    }
  }

  // 获取打赏详情记录
  const fetchDetailRecords = async (page: number) => {
    setDetailLoading(true)
    try {
      const response = await listDetailVoByPageUsingPost({
        current: page,
        pageSize: DETAIL_PAGE_SIZE,
      })
      if (response.code === 0 && response.data) {
        setDetails(response.data.records || [])
        setDetailTotal(Number(response.data.total || 0))
      }
    } catch (error) {
      console.error('获取打赏详情出错:', error)
    } finally {
      setDetailLoading(false)
    }
  }

  useEffect(() => {
    fetchDonationRecords(1)
    fetchDetailRecords(1)
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current || loading || !hasMore) return
      const { scrollTop, scrollHeight } = document.documentElement
      if (window.innerHeight + scrollTop >= scrollHeight - 100) {
        const nextPage = currentPage + 1
        setCurrentPage(nextPage)
        fetchDonationRecords(nextPage, true)
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [loading, hasMore, currentPage])

  // 清除轮询定时器
  const clearPollTimer = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }, [])

  // 轮询订单状态
  const pollOrderStatus = useCallback(async (tradeOrderId: string, count: number) => {
    if (count >= MAX_POLL_COUNT) {
      clearPollTimer()
      message.warning('支付超时，请重新发起支付')
      setPayStep('select')
      return
    }
    try {
      const res = await queryOrderUsingGet({ tradeOrderId })
      if (res.code === 0 && res.data?.status === 'OD') {
        clearPollTimer()
        setPayStep('success')
        setCurrentPage(1)
        fetchDonationRecords(1)
        fetchDetailRecords(1)
        return
      }
    } catch (e) {
      // 查询失败不中断轮询，继续等待
    }
    pollTimerRef.current = setTimeout(() => {
      setPollCount(c => c + 1)
      pollOrderStatus(tradeOrderId, count + 1)
    }, POLL_INTERVAL)
  }, [clearPollTimer])

  // 关闭弹窗时清理状态
  const handleModalClose = () => {
    clearPollTimer()
    setIsModalVisible(false)
    setPayStep('select')
    setPayOrder(null)
    setRemark('')
    setCustomAmount(null)
    setSelectedAmount(9.9)
    setPollCount(0)
  }

  // 发起支付
  const handleCreatePay = async () => {
    const amount = customAmount ?? selectedAmount
    if (!amount || amount <= 0) {
      message.warning('请选择或输入打赏金额')
      return
    }
    setPayCreating(true)
    try {
      const res = await createPayOrderUsingPost({
        totalFee: amount,
        type: 1,
        remark: remark || undefined,
        returnUrl: window.location.href,
      })
      if (res.code === 0 && res.data) {
        setPayOrder(res.data)
        setPayStep('qrcode')
        setPollCount(0)
        if (isMobile && res.data.payUrl) {
          window.location.href = res.data.payUrl
        } else if (res.data.tradeOrderId) {
          pollTimerRef.current = setTimeout(() => {
            pollOrderStatus(res.data!.tradeOrderId!, 0)
          }, POLL_INTERVAL)
        }
      } else {
        message.error(res.message || '创建支付订单失败，请稍后重试')
      }
    } catch (e) {
      message.error('创建支付订单失败，请稍后重试')
    } finally {
      setPayCreating(false)
    }
  }

  useEffect(() => {
    return () => clearPollTimer()
  }, [clearPollTimer])

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <CrownOutlined style={{ color: "#FFD700" }} />
      case 1: return <CrownOutlined style={{ color: "#C0C0C0" }} />
      case 2: return <CrownOutlined style={{ color: "#CD7F32" }} />
      default: return null
    }
  }

  const getRankClass = (index: number) => {
    switch (index) {
      case 0: return "gold"
      case 1: return "silver"
      case 2: return "bronze"
      default: return "normal"
    }
  }

  const finalAmount = customAmount ?? selectedAmount

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return ''
    const d = new Date(timeStr)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 7) return `${days}天前`
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  // 弹窗内容：选择金额步骤
  const renderSelectStep = () => (
    <div style={{ padding: '8px 0' }}>
      <div style={{ marginBottom: 16 }}>
        <Text strong>选择打赏金额</Text>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          {PRESET_AMOUNTS.map(amt => (
            <Tag
              key={amt}
              color={selectedAmount === amt && customAmount === null ? 'orange' : 'default'}
              style={{
                cursor: 'pointer',
                padding: '6px 16px',
                fontSize: 15,
                borderRadius: 20,
                border: selectedAmount === amt && customAmount === null ? '1.5px solid #fa8c16' : '1.5px solid #d9d9d9',
                userSelect: 'none',
              }}
              onClick={() => { setSelectedAmount(amt); setCustomAmount(null) }}
            >
              ￥{amt}
            </Tag>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Text strong>自定义金额（元）</Text>
        <InputNumber
          style={{ width: '100%', marginTop: 8 }}
          min={0.01}
          max={9999}
          precision={2}
          placeholder="输入自定义金额"
          value={customAmount ?? undefined}
          onChange={val => {
            setCustomAmount(val ?? null)
            if (val) setSelectedAmount(0)
          }}
          prefix="￥"
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <Text strong>备注（可选）</Text>
        <TextArea
          style={{ marginTop: 8 }}
          rows={2}
          maxLength={50}
          placeholder="备注大佬想展示的信息，会出现在打赏榜上"
          value={remark}
          onChange={e => setRemark(e.target.value)}
          showCount
        />
      </div>

      <div style={{ backgroundColor: 'var(--ant-color-bg-container)', border: '1px solid rgba(250,140,22,0.2)', padding: 12, borderRadius: 8, marginBottom: 20 }}>
        <p style={{ fontWeight: 'bold', color: '#fa8c16', marginBottom: 8 }}>打赏福利通知：</p>
        <ul style={{ paddingLeft: 20, margin: 0, color: '#555' }}>
          <li>1 - 获得"天使投资人"头衔</li>
          <li>29.9 - 自动领取永久会员，没有永久联系岛主</li>
          <li>100 - 顶级大哥可找岛主开发代码定制头衔称号➕定制专属福利兑换码</li>
        </ul>
      </div>

      <Button
        type="primary"
        block
        size="large"
        icon={<GiftOutlined />}
        loading={payCreating}
        disabled={!finalAmount || finalAmount <= 0}
        onClick={handleCreatePay}
        style={{ background: '#fa8c16', borderColor: '#fa8c16' }}
      >
        {payCreating ? '创建订单中...' : `确认打赏 ￥${finalAmount || '--'}`}
      </Button>

      <p style={{ color: '#999', textAlign: 'center', marginTop: 12, fontSize: 12 }}>
        有疑问或需要帮助请联系站长微信：Lhc_iuuaiong
      </p>
    </div>
  )

  // 弹窗内容：展示二维码步骤
  const renderQrcodeStep = () => (
    <div style={{ textAlign: 'center', padding: '8px 0' }}>
      {isMobile ? (
        <div style={{ padding: '20px 0' }}>
          <MobileOutlined style={{ fontSize: 48, color: '#fa8c16' }} />
          <p style={{ marginTop: 16, fontSize: 16 }}>已跳转到支付页面</p>
          <p style={{ color: '#999' }}>请在支付页面完成支付后返回</p>
          <Button
            type="primary"
            style={{ marginTop: 16, background: '#fa8c16', borderColor: '#fa8c16' }}
            onClick={() => {
              if (payOrder?.tradeOrderId) {
                pollOrderStatus(payOrder.tradeOrderId, 0)
              }
            }}
          >
            我已完成支付
          </Button>
        </div>
      ) : (
        <>
          <p style={{ color: '#555', marginBottom: 12 }}>
            请使用微信或支付宝扫码支付 <Text strong style={{ color: '#fa8c16' }}>￥{payOrder?.totalFee}</Text>
          </p>
          {payOrder?.urlQrcode ? (
            <div style={{ display: 'inline-block', padding: 12, border: '1px solid #f0f0f0', borderRadius: 8 }}>
              <img src={payOrder.urlQrcode} alt="支付二维码" style={{ width: 200, height: 200, display: 'block' }} />
            </div>
          ) : (
            <Spin size="large" />
          )}
          <div style={{ marginTop: 16, color: '#999', fontSize: 13 }}>
            <LoadingOutlined style={{ marginRight: 6 }} />
            等待支付结果...（{MAX_POLL_COUNT - pollCount} 秒后超时）
          </div>
          <p style={{ color: '#bbb', fontSize: 12, marginTop: 8 }}>
            订单号：{payOrder?.tradeOrderId}
          </p>
        </>
      )}

      <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'center' }}>
        <Button
          type="primary"
          style={{ background: '#fa8c16', borderColor: '#fa8c16' }}
          onClick={() => {
            if (payOrder?.tradeOrderId) {
              clearPollTimer()
              pollOrderStatus(payOrder.tradeOrderId, 0)
            }
          }}
        >
          我已支付
        </Button>
        <Button
          onClick={() => {
            clearPollTimer()
            setPayStep('select')
            setPayOrder(null)
          }}
        >
          重新选择金额
        </Button>
      </div>
    </div>
  )

  // 弹窗内容：支付成功步骤
  const renderSuccessStep = () => (
    <div style={{ textAlign: 'center', padding: '24px 0' }}>
      <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a' }} />
      <Title level={4} style={{ marginTop: 16, color: '#52c41a' }}>支付成功！感谢您的支持 💝</Title>
      <p style={{ color: '#666' }}>您的打赏已记录，榜单将自动更新</p>
      <Space style={{ marginTop: 16 }}>
        <Button type="primary" onClick={handleModalClose} style={{ background: '#fa8c16', borderColor: '#fa8c16' }}>
          关闭
        </Button>
        <Button onClick={() => { setPayStep('select'); setPayOrder(null); setRemark(''); setCustomAmount(null); setSelectedAmount(29.9) }}>
          再次打赏
        </Button>
      </Space>
    </div>
  )

  const stepItems = [
    { title: '选择金额' },
    { title: '扫码支付' },
    { title: '支付成功' },
  ]
  const currentStepIndex = payStep === 'select' ? 0 : payStep === 'qrcode' ? 1 : 2

  return (
    <div className="leaderboard-container" ref={containerRef}>
      <div className="header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={2} className="header-title">
            <TrophyOutlined className="header-icon" />
            打赏榜
          </Title>
          <Button
            type="primary"
            icon={<GiftOutlined />}
            size="large"
            onClick={() => setIsModalVisible(true)}
            style={{ background: '#fa8c16', borderColor: '#fa8c16' }}
          >
            打赏支持
          </Button>
        </div>
        <Text type="secondary">感谢每一位支持者的鼓励与厚爱 💝</Text>

        <div className="stats-row">
          <Card className="stats-card stats-card-donors">
            <Statistic
              title={<span><HeartOutlined /> 爱心总数</span>}
              value={totalDonors}
              suffix="人"
              valueStyle={{ color: "#fa8c16" }}
            />
          </Card>
          <Card className="stats-card stats-card-amount">
            <Statistic
              title={<span><GiftOutlined /> 打赏总额</span>}
              value={totalAmount}
              prefix="￥"
              valueStyle={{ color: "#13c2c2" }}
            />
          </Card>
        </div>
      </div>

      <Modal
        title="打赏支持 💗"
        open={isModalVisible}
        onCancel={handleModalClose}
        footer={null}
        width={440}
        destroyOnClose
      >
        <Steps
          current={currentStepIndex}
          items={stepItems}
          size="small"
          style={{ marginBottom: 24 }}
        />
        {payStep === 'select' && renderSelectStep()}
        {payStep === 'qrcode' && renderQrcodeStep()}
        {payStep === 'success' && renderSuccessStep()}
      </Modal>

      {/* 主体：左侧榜单 + 右侧详情 */}
      <div className="main-layout">
        {/* 左侧：排行榜 */}
        <div className="rank-section">
          <div className="divider">
            <Divider />
            <div className="divider-text">
              <RiseOutlined className="divider-icon" />
              排行榜
            </div>
          </div>

          <ul className="donor-list">
            {donors.map((item, index) => (
              <li key={item.id} className="donor-item">
                <div className="donor-card">
                  <div className="donor-content">
                    <div className="avatar-container">
                      <div className="avatarWithFrame">
                        <Avatar
                          size={64}
                          src={item.donorUser?.userAvatar}
                          className={`avatar ${getRankClass(index)}`}
                        />
                        {item.donorUser && 'avatarFramerUrl' in item.donorUser && item.donorUser.avatarFramerUrl && (
                          <img
                            src={item.donorUser.avatarFramerUrl as string}
                            className="avatarFrame"
                            alt="avatar-frame"
                          />
                        )}
                      </div>
                      {index < 3 && (
                        <div className={`rank-tag ${getRankClass(index)}`}>
                          {getRankIcon(index)} {index + 1}
                        </div>
                      )}
                    </div>

                    <div className="donor-info">
                      <div className="donor-header">
                        <Title level={5} className="donor-name">
                          {item.donorUser?.userName || '匿名用户'}{" "}
                          <Text type="secondary" className="donor-emoji">(🚀)</Text>
                        </Title>
                        <Tooltip title="打赏金额">
                          <span className="amount-tag">￥{item.amount}</span>
                        </Tooltip>
                      </div>
                      <Text type="secondary" className="donor-message">
                        "{item.remark || '感谢支持'}"
                      </Text>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {loading && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <Spin tip="加载中..." />
            </div>
          )}

          {!loading && donors.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
              暂无打赏记录
            </div>
          )}

          {!loading && !hasMore && donors.length > 0 && (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#999' }}>
              没有更多数据了
            </div>
          )}
        </div>

        {/* 右侧：打赏详情记录 */}
        <div className="detail-section">
          <div className="detail-header">
            <HistoryOutlined className="detail-header-icon" />
            <span>打赏动态</span>
            <Badge count={detailTotal} overflowCount={999} style={{ backgroundColor: '#fa8c16', marginLeft: 8 }} />
          </div>

          <div className="detail-list-wrap">
            <List
              loading={detailLoading}
              dataSource={details}
              locale={{ emptyText: '暂无记录' }}
              pagination={detailTotal > DETAIL_PAGE_SIZE ? {
                current: detailPage,
                pageSize: DETAIL_PAGE_SIZE,
                total: detailTotal,
                size: 'small',
                onChange: (page) => {
                  setDetailPage(page)
                  fetchDetailRecords(page)
                },
                showSizeChanger: false,
              } : false}
              renderItem={(item) => (
                <List.Item className="detail-item">
                  <div className="detail-item-inner">
                    <Avatar
                      size={32}
                      src={item.donorUser?.userAvatar}
                      className="detail-avatar"
                    />
                    <div className="detail-content">
                      <div className="detail-top">
                        <Text strong className="detail-name">
                          {item.donorUser?.userName || '匿名用户'}
                        </Text>
                        <span className="detail-amount">+￥{item.amount}</span>
                      </div>
                      {item.remark && (
                        <Text type="secondary" className="detail-remark">
                          {item.remark}
                        </Text>
                      )}
                      <div className="detail-time">
                        <ClockCircleOutlined style={{ marginRight: 4, fontSize: 11 }} />
                        {formatTime(item.createTime)}
                      </div>
                    </div>
                  </div>
                </List.Item>
              )}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
