"use client"

import { Card, Switch } from "antd"
import { InfoIcon as InfoCircleOutlined } from "lucide-react"

interface ComparisonSettingsProps {
  ignoreCase: boolean
  setIgnoreCase: (value: boolean) => void
  ignoreWhitespace: boolean
  setIgnoreWhitespace: (value: boolean) => void
}

export default function ComparisonSettings({
                                             ignoreCase,
                                             setIgnoreCase,
                                             ignoreWhitespace,
                                             setIgnoreWhitespace,
                                           }: ComparisonSettingsProps) {
  return (
    <Card
      className="settings-card"
      size="small"
      title={
        <div className="settings-title">
          <InfoCircleOutlined />
          比对设置
        </div>
      }
    >
      <div className="settings-grid">
        <div className="setting-item">
          <div className="setting-info">
            <p className="setting-label">忽略大小写</p>
            <p className="setting-description">比对时不区分大小写字母</p>
          </div>
          <Switch
            checked={ignoreCase}
            onChange={setIgnoreCase}
            style={ignoreCase ? { backgroundColor: "#3b82f6" } : {}}
          />
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <p className="setting-label">忽略空白字符</p>
            <p className="setting-description">忽略多余的空格、制表符和换行符</p>
          </div>
          <Switch
            checked={ignoreWhitespace}
            onChange={setIgnoreWhitespace}
            style={ignoreWhitespace ? { backgroundColor: "#3b82f6" } : {}}
          />
        </div>
      </div>
    </Card>
  )
}
