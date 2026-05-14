import React, { useState, useEffect } from 'react';
import {
  Form,
  Button,
  Slider,
  Space,
  Divider,
  Select,
  Tooltip,
  Input
} from 'antd';
import { QuestionCircleOutlined, UndoOutlined } from '@ant-design/icons';
import type { Color } from 'antd/es/color-picker';

const { Option } = Select;

// 定义颜色转换函数，将Color类型转换为颜色字符串
const colorToString = (color: Color | string): string => {
  if (typeof color === 'string') return color;
  return color.toHexString();
};

// 定义字体选项
const fontOptions = [
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: '黑体', value: 'SimHei, sans-serif' },
  { label: '宋体', value: 'SimSun, serif' },
  { label: '微软雅黑', value: '"Microsoft YaHei", sans-serif' },
  { label: '楷体', value: 'KaiTi, serif' },
  { label: '仿宋', value: 'FangSong, serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
];

// 定义键盘按键选项
const keyOptions = [
  { label: '左方向键', value: 'ArrowLeft' },
  { label: '右方向键', value: 'ArrowRight' },
  { label: '上方向键', value: 'ArrowUp' },
  { label: '下方向键', value: 'ArrowDown' },
  { label: 'Page Up', value: 'PageUp' },
  { label: 'Page Down', value: 'PageDown' },
  { label: 'A', value: 'KeyA' },
  { label: 'D', value: 'KeyD' },
  { label: 'W', value: 'KeyW' },
  { label: 'S', value: 'KeyS' },
  { label: 'J', value: 'KeyJ' },
  { label: 'K', value: 'KeyK' },
  { label: 'Esc', value: 'Escape' },
  { label: '空格', value: 'Space' },
];

// 定义隐藏模式选项
const hideOptions = [
  { label: '鼠标移出', value: 'mouseOut' },
  { label: '按键', value: 'key' },
  { label: '无', value: 'none' },
];

interface ReaderSettings {
  fontColor: string;
  backgroundColor: string;
  opacity: number;
  allowWindowMove: boolean;
  fontSize: number;
  fontFamily: string;
  prevPageKey: string;
  nextPageKey: string;
  quickHide: 'mouseOut' | 'key' | 'none';
  panicKey: string;
  accessToken?: string;
  apiBaseUrl?: string;
}

interface ReaderSettingsProps {
  settings: ReaderSettings;
  onSave: (settings: ReaderSettings) => void;
}

// eslint-disable-next-line @typescript-eslint/no-redeclare
const ReaderSettings: React.FC<ReaderSettingsProps> = ({ settings, onSave }) => {
  const [form] = Form.useForm();
  const [localSettings, setLocalSettings] = useState<ReaderSettings>(settings);

  // 组件加载时从localStorage获取最新设置
  useEffect(() => {
    // 获取最新保存的设置
    const savedSettings = localStorage.getItem("fish-reader-settings");
    if (savedSettings) {
      try {
        const latestSettings = JSON.parse(savedSettings);
        // 更新表单
        form.setFieldsValue(latestSettings);
        // 更新本地状态
        setLocalSettings(latestSettings);
      } catch (e) {
        console.error('解析已保存的阅读器设置失败:', e);
      }
    } else {
      // 如果没有保存的设置，使用props传入的设置
      form.setFieldsValue(settings);
    }
  }, [form, settings]);

  // 保存设置
  const handleSubmit = () => {
    form.validateFields().then(values => {
      const updatedSettings = { ...localSettings, ...values };
      onSave(updatedSettings);
    });
  };

  // 重置设置
  const handleReset = () => {
    form.resetFields();
    setLocalSettings(settings);
  };

  // 确保默认设置为none
  React.useEffect(() => {
    if (!form.getFieldValue('quickHide')) {
      form.setFieldsValue({ quickHide: 'none' });
    }
  }, [form]);

  // 实时更新本地设置
  const updateLocalSettings = (changedValues: any, allValues: any) => {
    const newSettings = { ...localSettings, ...allValues };

    if (changedValues.fontColor) {
      newSettings.fontColor = colorToString(changedValues.fontColor);
    }

    if (changedValues.backgroundColor) {
      newSettings.backgroundColor = colorToString(changedValues.backgroundColor);
    }

    setLocalSettings(newSettings);
  };

  // 在form的initialValues中使用最新的设置
  const getInitialValues = () => {
    // 优先从localStorage获取最新设置
    const savedSettings = localStorage.getItem("fish-reader-settings");
    if (savedSettings) {
      try {
        return JSON.parse(savedSettings);
      } catch (e) {
        console.error('解析已保存的阅读器设置失败:', e);
      }
    }
    // 回退到props设置
    return settings;
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={getInitialValues()}
      onValuesChange={updateLocalSettings}
    >
      <div style={{ marginBottom: 24, textAlign: 'right' }}>
        <Button
          icon={<UndoOutlined />}
          onClick={handleReset}
          style={{ marginRight: 8 }}
        >
          恢复默认设置
        </Button>
        <Button type="primary" onClick={handleSubmit}>
          保存设置
        </Button>
      </div>

      <Divider orientation="center">外观设置</Divider>

      <Form.Item
        label="阅读窗口透明度"
        name="opacity"
        tooltip="值越小越透明"
      >
        <Slider
          min={0}
          max={1}
          step={0.01}
          marks={{
            0: '0',
            0.5: '0.5',
            1: '1'
          }}
        />
      </Form.Item>

      <Form.Item
        label="字体大小"
        name="fontSize"
      >
        <Slider
          min={12}
          max={30}
          marks={{
            12: '12',
            16: '16',
            20: '20',
            24: '24',
            30: '30'
          }}
        />
      </Form.Item>

      <Form.Item
        label="字体"
        name="fontFamily"
      >
        <Select>
          {fontOptions.map(option => (
            <Option key={option.value} value={option.value}>
              {option.label}
            </Option>
          ))}
        </Select>
      </Form.Item>

      <Divider orientation="center">按键设置</Divider>

      <Form.Item
        label={
          <Space>
            <span>上一页按键</span>
            <Tooltip title="按下该键可快速翻到上一页">
              <QuestionCircleOutlined />
            </Tooltip>
          </Space>
        }
        name="prevPageKey"
      >
        <Select>
          {keyOptions.map(option => (
            <Option key={option.value} value={option.value}>
              {option.label}
            </Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        label={
          <Space>
            <span>下一页按键</span>
            <Tooltip title="按下该键可快速翻到下一页">
              <QuestionCircleOutlined />
            </Tooltip>
          </Space>
        }
        name="nextPageKey"
      >
        <Select>
          {keyOptions.map(option => (
            <Option key={option.value} value={option.value}>
              {option.label}
            </Option>
          ))}
        </Select>
      </Form.Item>

      <Divider orientation="center">其他设置</Divider>

      <Form.Item
        label={
          <Space>
            <span>紧急切换键</span>
            <Tooltip title="按下该键可快速关闭阅读器并切换到工作模式，用于紧急情况">
              <QuestionCircleOutlined />
            </Tooltip>
          </Space>
        }
        name="panicKey"
      >
        <Select>
          {keyOptions.map(option => (
            <Option key={option.value} value={option.value}>
              {option.label}
            </Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        label={
          <Space>
            <span>快速隐藏阅读窗口</span>
            <Tooltip title="设置触发条件，让阅读窗口快速隐藏，方便摸鱼时快速隐藏内容">
              <QuestionCircleOutlined />
            </Tooltip>
          </Space>
        }
        name="quickHide"
      >
        <Select>
          {hideOptions.map(option => (
            <Option key={option.value} value={option.value}>
              {option.label}
            </Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        label={
          <Space>
            <span>API服务地址</span>
            <Tooltip title="摸鱼阅读API服务器地址，默认为官方服务器">
              <QuestionCircleOutlined />
            </Tooltip>
          </Space>
        }
        name="apiBaseUrl"
      >
        <Input placeholder="https://reader.yucoder.cn/reader3" />
      </Form.Item>
    </Form>
  );
};

export default ReaderSettings;
