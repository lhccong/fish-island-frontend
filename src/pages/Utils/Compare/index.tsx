"use client"

import type React from "react"

import { useState } from "react"
import { Button, Radio, Tooltip, Spin, message } from "antd"
import {
  FileTextIcon as FileTextOutlined,
  ReplaceIcon as SwapOutlined,
  DeleteIcon as DeleteOutlined,
  CopyIcon as CopyOutlined,
  BaselineIcon as SettingOutlined,
} from "lucide-react"
import TextComparisonResult from "@/components/TextComparisonResult"
import ComparisonSettings from "@/components/ComparisonSettings"
import "./index.css"

export default function TextComparisonPage() {
  const [leftText, setLeftText] = useState("")
  const [rightText, setRightText] = useState("")
  const [comparisonResult, setComparisonResult] = useState<any>(null)
  const [comparisonType, setComparisonType] = useState("character")
  const [loading, setLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [ignoreCase, setIgnoreCase] = useState(false)
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false)

  // 修改 compareTexts 函数，添加高亮文本状态
  const [highlightedLeftText, setHighlightedLeftText] = useState<React.ReactNode>(null)
  const [highlightedRightText, setHighlightedRightText] = useState<React.ReactNode>(null)

  const compareTexts = () => {
    if (!leftText.trim() || !rightText.trim()) {
      message.warning("请在两侧都输入文本后再进行比对")
      return
    }

    setLoading(true)

    // 模拟比对过程
    setTimeout(() => {
      let left = leftText
      let right = rightText

      if (ignoreCase) {
        left = left.toLowerCase()
        right = right.toLowerCase()
      }

      if (ignoreWhitespace) {
        left = left.replace(/\s+/g, " ").trim()
        right = right.replace(/\s+/g, " ").trim()
      }

      // 简单的差异计算逻辑
      const result = {
        differences: [],
        similarityScore: 0,
      }

      // 字符级比对
      if (comparisonType === "character") {
        let diffCount = 0
        const maxLength = Math.max(left.length, right.length)

        for (let i = 0; i < maxLength; i++) {
          if (left[i] !== right[i]) {
            diffCount++
            // @ts-ignore
            result.differences.push({
              position: i,
              leftChar: left[i] || "",
              rightChar: right[i] || "",
            })
          }
        }

        result.similarityScore = Math.round(((maxLength - diffCount) / maxLength) * 100)
      } else {
        // 词级比对
        const leftWords = left.split(/\s+/)
        const rightWords = right.split(/\s+/)
        let diffCount = 0
        const maxLength = Math.max(leftWords.length, rightWords.length)

        for (let i = 0; i < maxLength; i++) {
          if (leftWords[i] !== rightWords[i]) {
            diffCount++
            // @ts-ignore
            result.differences.push({
              position: i,
              leftWord: leftWords[i] || "",
              rightWord: rightWords[i] || "",
            })
          }
        }

        result.similarityScore = Math.round(((maxLength - diffCount) / maxLength) * 100)
      }

      setComparisonResult(result)

      // 生成高亮文本
      setHighlightedLeftText(highlightDifferences(leftText, result.differences, true))
      setHighlightedRightText(highlightDifferences(rightText, result.differences, false))

      setLoading(false)
    }, 800)
  }

  // 添加高亮差异的函数
  const highlightDifferences = (text: string, differences: any[], isLeft: boolean) => {
    if (comparisonType === "character") {
      // 字符级比对高亮
      const result: React.ReactNode[] = []
      let lastPos = 0

      // 按位置排序差异
      const sortedDiffs = [...differences].sort((a, b) => a.position - b.position)

      for (const diff of sortedDiffs) {
        const pos = diff.position

        // 添加差异前的文本，保持原始格式
        if (pos > lastPos) {
          const textSegment = text.substring(lastPos, pos)
          result.push(<span key={`normal-${lastPos}`}>{textSegment}</span>)
        }

        // 添加差异字符
        const char = isLeft ? diff.leftChar : diff.rightChar
        if (char) {
          result.push(
            <span key={`diff-${pos}`} className="diff-char">
              {char}
            </span>
          )
        }

        lastPos = pos + 1
      }

      // 添加剩余文本，保持原始格式
      if (lastPos < text.length) {
        const textSegment = text.substring(lastPos)
        result.push(<span key={`normal-end`}>{textSegment}</span>)
      }

      return result
    } else {
      // 词级比对高亮
      // 使用正则表达式保留所有空白字符（包括换行）
      const words = text.split(/(\s+)/g)
      const result: React.ReactNode[] = []
      
      words.forEach((segment, index) => {
        if (/^\s+$/.test(segment)) {
          // 如果是空白字符，直接添加
          result.push(<span key={`space-${index}`}>{segment}</span>)
        } else if (segment) {
          const wordIndex = Math.floor(index / 2) // 计算实际的词索引
          const diff = differences.find((d) => d.position === wordIndex)
          
          if (diff) {
            const isDifferent = isLeft ? diff.leftWord !== diff.rightWord : diff.rightWord !== diff.leftWord
            if (isDifferent) {
              result.push(
                <span key={`diff-${index}`} className="diff-word">
                  {segment}
                </span>
              )
            } else {
              result.push(<span key={`word-${index}`}>{segment}</span>)
            }
          } else {
            result.push(<span key={`word-${index}`}>{segment}</span>)
          }
        }
      })

      return result
    }
  }

  const swapTexts = () => {
    setLeftText(rightText)
    setRightText(leftText)
  }

  // 修改清空文本函数，同时清除高亮状态
  const clearTexts = () => {
    setLeftText("")
    setRightText("")
    setComparisonResult(null)
    setHighlightedLeftText(null)
    setHighlightedRightText(null)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    message.success("已复制到剪贴板")
  }

  return (
    <main className="main">
      <div className="container">
        <header className="header">
          <h1 className="title">文本比对工具</h1>
          <p className="subtitle">比较两段文本，找出它们之间的差异</p>
        </header>

        <div className="card">
          <div className="text-areas">
            {/* 左侧文本区域 */}
            <div className="text-area-container">
              <div className="text-area-header">
                <h2 className="text-area-title">
                  <FileTextOutlined />
                  文本 A
                </h2>
                <div>
                  <Tooltip title="复制">
                    <Button
                      type="text"
                      shape="circle"
                      icon={<CopyOutlined className="h-4 w-4" />}
                      onClick={() => copyToClipboard(leftText)}
                      disabled={!leftText}
                    />
                  </Tooltip>
                </div>
              </div>
              {highlightedLeftText ? (
                <div
                  className="text-display"
                  onClick={() => {
                    setHighlightedLeftText(null)
                    setHighlightedRightText(null)
                  }}
                >
                  {highlightedLeftText}
                </div>
              ) : (
                <textarea
                  className="text-area"
                  value={leftText}
                  onChange={(e) => setLeftText(e.target.value)}
                  placeholder="请在此输入第一段文本..."
                />
              )}
            </div>

            <div className="controls-container">
              <Tooltip title="交换文本">
                <Button type="default" shape="circle" icon={<SwapOutlined className="h-4 w-4" />} onClick={swapTexts} />
              </Tooltip>
              <Tooltip title="清空文本">
                <Button
                  type="default"
                  shape="circle"
                  danger
                  icon={<DeleteOutlined className="h-4 w-4" />}
                  onClick={clearTexts}
                />
              </Tooltip>
            </div>

            {/* 右侧文本区域 */}
            <div className="text-area-container">
              <div className="text-area-header">
                <h2 className="text-area-title">
                  <FileTextOutlined />
                  文本 B
                </h2>
                <div>
                  <Tooltip title="复制">
                    <Button
                      type="text"
                      shape="circle"
                      icon={<CopyOutlined className="h-4 w-4" />}
                      onClick={() => copyToClipboard(rightText)}
                      disabled={!rightText}
                    />
                  </Tooltip>
                </div>
              </div>
              {highlightedRightText ? (
                <div
                  className="text-display"
                  onClick={() => {
                    setHighlightedLeftText(null)
                    setHighlightedRightText(null)
                  }}
                >
                  {highlightedRightText}
                </div>
              ) : (
                <textarea
                  className="text-area"
                  value={rightText}
                  onChange={(e) => setRightText(e.target.value)}
                  placeholder="请在此输入第二段文本..."
                />
              )}
            </div>
          </div>

          <div className="actions">
            <div className="comparison-options">
              <div className="comparison-type">
                <span className="comparison-type-label">比对方式:</span>
                <Radio.Group
                  value={comparisonType}
                  onChange={(e) => setComparisonType(e.target.value)}
                  optionType="button"
                  buttonStyle="solid"
                >
                  <Radio.Button value="character">字符级</Radio.Button>
                  <Radio.Button value="word">词级</Radio.Button>
                </Radio.Group>
              </div>

              <Tooltip title="比对设置">
                <Button
                  type="default"
                  shape="circle"
                  icon={<SettingOutlined className="h-4 w-4" />}
                  onClick={() => setShowSettings(!showSettings)}
                  style={showSettings ? { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" } : {}}
                />
              </Tooltip>
            </div>

            <Button
              type="primary"
              size="large"
              onClick={compareTexts}
              style={{ backgroundColor: "#3b82f6" }}
              disabled={!leftText.trim() || !rightText.trim() || loading}
            >
              {loading ? <Spin size="small" /> : "开始比对"}
            </Button>
          </div>

          {showSettings && (
            <ComparisonSettings
              ignoreCase={ignoreCase}
              setIgnoreCase={setIgnoreCase}
              ignoreWhitespace={ignoreWhitespace}
              setIgnoreWhitespace={setIgnoreWhitespace}
            />
          )}

          {/* 在 TextComparisonResult 组件调用处添加条件，不显示文本高亮部分 */}
          {comparisonResult && (
            <TextComparisonResult
              result={comparisonResult}
              leftText={leftText}
              rightText={rightText}
              comparisonType={comparisonType}
              hideTextDisplay={true}
            />
          )}
        </div>
      </div>
    </main>
  )
}
