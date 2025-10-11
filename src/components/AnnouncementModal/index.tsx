import { getFileContent } from '@/services/file';
import { NotificationOutlined } from '@ant-design/icons';
import { Modal } from 'antd';
import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import './index.less';

interface Props {
  open: boolean;
  onCancel: () => void;
}

const AnnouncementModal: React.FC<Props> = ({ open, onCancel }) => {
  const [content, setContent] = useState<string>('');

  useEffect(() => {
    if (open) {
      getFileContent('CHANGELOG.md').then((res) => {
        if (res.code === 0) {
          setContent(res.data);
        }
      });
    }
  }, [open]);

  return (
    <Modal
      className={'announcement-modal'}
      open={open}
      onCancel={onCancel}
      title={
        <span>
          <NotificationOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
          更新公告
        </span>
      }
      footer={null}
      width={600}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
        {content}
      </ReactMarkdown>
    </Modal>
  );
};

export default AnnouncementModal;
