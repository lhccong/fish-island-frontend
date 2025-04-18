import { Progress, Card } from "antd"
import { CircleCheckIcon as CheckCircleOutlined, CircleOffIcon as CloseCircleOutlined } from "lucide-react"

interface ComparisonResultProps {
  result: {
    differences: any[]
    similarityScore: number
  }
  leftText: string
  rightText: string
  comparisonType: string
  hideTextDisplay?: boolean
}

export default function TextComparisonResult({
                                               result,
                                               leftText,
                                               rightText,
                                               comparisonType,
                                               hideTextDisplay = false,
                                             }: ComparisonResultProps) {
  const { differences, similarityScore } = result

  const getScoreColor = (score: number) => {
    if (score >= 90) return "#52c41a"
    if (score >= 70) return "#1890ff"
    if (score >= 50) return "#faad14"
    return "#f5222d"
  }

  const getScoreStatus = (score: number) => {
    if (score >= 90) return "success"
    if (score >= 70) return "normal"
    if (score >= 50) return "active"
    return "exception"
  }

  const getSimilarityClass = (score: number) => {
    if (score >= 90) return "success"
    if (score >= 70) return "info"
    if (score >= 50) return "warning"
    return "error"
  }

  const highlightDifferences = (text: string, isLeft: boolean) => {
    if (comparisonType === "character") {
      // 字符级比对高亮
      const result = []
      let lastPos = 0

      // 按位置排序差异
      const sortedDiffs = [...differences].sort((a, b) => a.position - b.position)

      for (const diff of sortedDiffs) {
        const pos = diff.position

        // 添加差异前的文本
        if (pos > lastPos) {
          result.push(<span key={`normal-${lastPos}`}>{text.substring(lastPos, pos)}</span>)
        }

        // 添加差异字符
        const char = isLeft ? diff.leftChar : diff.rightChar
        if (char) {
          result.push(
            <span key={`diff-${pos}`} className="diff-char">
              {char}
            </span>,
          )
        } else {
          result.push(
            <span key={`missing-${pos}`} className="missing-char">
              ⌷
            </span>,
          )
        }

        lastPos = pos + 1
      }

      // 添加剩余文本
      if (lastPos < text.length) {
        result.push(<span key={`normal-end`}>{text.substring(lastPos)}</span>)
      }

      return result
    } else {
      // 词级比对高亮
      const words = text.split(/\s+/)
      return words.map((word, index) => {
        const diff = differences.find((d) => d.position === index)
        if (diff) {
          const isDifferent = isLeft ? diff.leftWord !== diff.rightWord : diff.rightWord !== diff.leftWord
          const isMissing = isLeft ? !diff.leftWord : !diff.rightWord

          if (isMissing) {
            return (
              <span key={`missing-${index}`} className="missing-word">
                ⌷
              </span>
            )
          }

          if (isDifferent) {
            return (
              <span key={`diff-${index}`} className="diff-word">
                {word}
              </span>
            )
          }
        }

        return <span key={`word-${index}`}>{word} </span>
      })
    }
  }

  return (
    <div className="result-section">
      <div className="divider">比对结果</div>

      <div className="result-cards">
        <Card className="result-card" title="相似度分析" bordered={false}>
          <div className="similarity-container">
            <Progress
              type="dashboard"
              percent={similarityScore}
              strokeColor={getScoreColor(similarityScore)}
              status={getScoreStatus(similarityScore) as any}
              format={(percent) => `${percent}%`}
              style={{ marginBottom: "1rem" }}
            />
            <div className="text-center">
              <p className={`similarity-text ${getSimilarityClass(similarityScore)}`}>
                {similarityScore >= 90 ? (
                  <>
                    <CheckCircleOutlined />
                    文本几乎相同
                  </>
                ) : similarityScore >= 70 ? (
                  <>
                    <CheckCircleOutlined />
                    文本相似度高
                  </>
                ) : similarityScore >= 50 ? (
                  <>
                    <CloseCircleOutlined />
                    文本有较大差异
                  </>
                ) : (
                  <>
                    <CloseCircleOutlined />
                    文本差异显著
                  </>
                )}
              </p>
              <p className="similarity-details">
                发现 {differences.length} 处{comparisonType === "character" ? "字符" : "词语"}差异
              </p>
            </div>
          </div>
        </Card>

        <Card className="result-card" title="统计信息" bordered={false}>
          <div className="stats-grid">
            <div className="stats-item">
              <p className="stats-item-label">文本 A</p>
              <div className="stats-row">
                <span className="stats-key">字符数</span>
                <span>{leftText.length}</span>
              </div>
              <div className="stats-row">
                <span className="stats-key">词数</span>
                <span>{leftText.split(/\s+/).filter(Boolean).length}</span>
              </div>
            </div>

            <div className="stats-item">
              <p className="stats-item-label">文本 B</p>
              <div className="stats-row">
                <span className="stats-key">字符数</span>
                <span>{rightText.length}</span>
              </div>
              <div className="stats-row">
                <span className="stats-key">词数</span>
                <span>{rightText.split(/\s+/).filter(Boolean).length}</span>
              </div>
            </div>

            <div className="stats-item stats-full-width">
              <p className="stats-item-label">长度差异</p>
              <div className="stats-row">
                <span className="stats-key">字符差</span>
                <span>{Math.abs(leftText.length - rightText.length)}</span>
              </div>
              <div className="stats-row">
                <span className="stats-key">词数差</span>
                <span>
                  {Math.abs(
                    leftText.split(/\s+/).filter(Boolean).length - rightText.split(/\s+/).filter(Boolean).length,
                  )}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {!hideTextDisplay && (
        <div className="text-display-cards">
          <Card title="文本 A (高亮显示差异)" bordered={false}>
            <div className="text-display">{highlightDifferences(leftText, true)}</div>
          </Card>

          <Card title="文本 B (高亮显示差异)" bordered={false}>
            <div className="text-display">{highlightDifferences(rightText, false)}</div>
          </Card>
        </div>
      )}
    </div>
  )
}
