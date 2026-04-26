import { editItemTemplateUsingPost } from '@/services/backend/itemTemplatesController';
import { ProColumns, ProTable } from '@ant-design/pro-components';
import '@umijs/max';
import { message, Modal } from 'antd';
import React from 'react';

interface Props {
  oldData?: API.ItemTemplateVO;
  visible: boolean;
  columns: ProColumns<API.ItemTemplateVO>[];
  onSubmit: (values: API.ItemTemplateEditRequest) => void;
  onCancel: () => void;
}

/**
 * 更新节点
 *
 * @param fields
 */
const handleUpdate = async (fields: API.ItemTemplateEditRequest) => {
  const hide = message.loading('正在更新');
  try {
    await editItemTemplateUsingPost(fields);
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
      title={'更新物品模板'}
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
          },
        }}
        onSubmit={async (values: API.ItemTemplateEditRequest) => {
          // mainAttr 已经是 JSON 字符串格式，直接使用
          const success = await handleUpdate({
            ...values,
            id: oldData.id as any,
            // 确保数字类型字段正确转换
            stackable: values.stackable !== undefined ? Number(values.stackable) : undefined,
            rarity: values.rarity !== undefined ? Number(values.rarity) : undefined,
            baseAttack: values.baseAttack !== undefined ? Number(values.baseAttack) : undefined,
            baseDefense: values.baseDefense !== undefined ? Number(values.baseDefense) : undefined,
            baseHp: values.baseHp !== undefined ? Number(values.baseHp) : undefined,
            baseSpeed: values.baseSpeed !== undefined ? Number(values.baseSpeed) : undefined,
            levelReq: values.levelReq !== undefined ? Number(values.levelReq) : undefined,
            removePoint: values.removePoint !== undefined ? Number(values.removePoint) : undefined,
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

