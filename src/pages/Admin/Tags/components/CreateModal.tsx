import { addTagsUsingPost } from '@/services/backend/tagsController';
import { ProColumns, ProTable } from '@ant-design/pro-components';
import '@umijs/max';
import { message, Modal } from 'antd';
import React from 'react';

interface Props {
  visible: boolean;
  columns: ProColumns<API.TagsVO>[];
  onSubmit: (values: API.TagsAddRequest) => void;
  onCancel: () => void;
}

/**
 * 添加节点
 * @param fields
 */
const handleAdd = async (fields: API.TagsAddRequest) => {
  const hide = message.loading('正在添加');
  try {
    const res = await addTagsUsingPost(fields);
    hide();
    if (res.code === 0) {
      message.success('创建成功');
      return  true;
    }
  } catch (error: any) {
    hide();
    message.error('创建失败，' + error.message);
    return false;
  }
};

/**
 * 创建弹窗
 * @param props
 * @constructor
 */
const CreateModal: React.FC<Props> = (props) => {
  const { visible, columns, onSubmit, onCancel } = props;

  return (
    <Modal
      destroyOnClose
      title={'创建标签'}
      open={visible}
      footer={null}
      onCancel={() => {
        onCancel?.();
      }}
    >
      <ProTable
        type="form"
        columns={columns}
        form={{
          // 默认官方创建
          initialValues: {
            type: '0',
            sort: 0,
          }
        }}
        onSubmit={async (values: API.TagsAddRequest) => {
          const success = await handleAdd(values);
          if (success) {
            onSubmit?.(values);
          }
        }}
      />
    </Modal>
  );
};
export default CreateModal;
