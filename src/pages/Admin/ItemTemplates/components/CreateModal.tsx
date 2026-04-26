import { addItemTemplateUsingPost } from '@/services/backend/itemTemplatesController';
import { ProColumns, ProTable } from '@ant-design/pro-components';
import '@umijs/max';
import { message, Modal } from 'antd';
import React from 'react';

interface Props {
  visible: boolean;
  columns: ProColumns<API.ItemTemplateVO>[];
  onSubmit: (values: API.ItemTemplateAddRequest) => void;
  onCancel: () => void;
}

/**
 * 添加节点
 * @param fields
 */
const handleAdd = async (fields: API.ItemTemplateAddRequest) => {
  const hide = message.loading('正在添加');
  try {
    const res = await addItemTemplateUsingPost(fields);
    hide();
    if (res.code === 0) {
      message.success('创建成功');
      return true;
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
      title={'创建物品模板'}
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
            stackable: 0,
            rarity: 1,
            baseAttack: 0,
            baseDefense: 0,
            baseHp: 0,
            baseSpeed: 0,
            levelReq: 1,
            removePoint: 0,
          },
        }}
        onSubmit={async (values: API.ItemTemplateAddRequest) => {
          // mainAttr 已经是 JSON 字符串格式，直接使用
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

