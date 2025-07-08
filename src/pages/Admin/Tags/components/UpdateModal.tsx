import { updateTagsUsingPost } from '@/services/backend/tagsController';
import { ProColumns, ProTable } from '@ant-design/pro-components';
import '@umijs/max';
import { message, Modal } from 'antd';
import React from 'react';

interface Props {
  oldData?: API.TagsVO;
  visible: boolean;
  columns: ProColumns<API.TagsVO>[];
  onSubmit: (values: API.TagsUpdateRequest) => void;
  onCancel: () => void;
}

/**
 * 更新节点
 *
 * @param fields
 */
const handleUpdate = async (fields: API.TagsUpdateRequest) => {
  const hide = message.loading('正在更新');
  try {
    await updateTagsUsingPost(fields);
    hide();
    message.success('更新成功');
    return true;
  } catch (error: any) {
    hide();
    message.error('更新失败，' + error.message);
    return false;
  }
};

/**
 * 更新弹窗
 * @param props
 * @constructor
 */
const UpdateModal: React.FC<Props> = (props) => {
  const { oldData, visible, columns, onSubmit, onCancel } = props;

  if (!oldData) {
    return <></>;
  }

  return (
    <Modal
      destroyOnClose
      title={'更新标签'}
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
          initialValues: {
            ...oldData,
            // 确保类型值被正确识别
            type: oldData.type?.toString()
          },
        }}
        onSubmit={async (values: API.TagsUpdateRequest) => {
          const success = await handleUpdate({
            ...values,
            id: oldData.id as any,
          });
          if (success) {
            onSubmit?.(values);
          }
        }}
      />
    </Modal>
  );
};
export default UpdateModal;
