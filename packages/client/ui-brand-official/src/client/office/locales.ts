import type { LocaleDictOf } from '@deepseek-ai/dsh-client-ui-slots'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'phoenix.office': keyof typeof zh
  }
}

export const zh = {
  'employee.create': '新建员工',
  'employee.delete': '删除员工',
  'employee.deleteTitle': '删除「{name}」？',
  'employee.deleteDescription': '员工将从办公室和群聊中移除，现有对话将归档。',
  'employee.deletePending': '正在删除…',
  'employee.deleteFailed': '删除失败：{message}',
  'employee.deleteProtected': '总指挥不能直接删除。请先在员工管理中将总指挥交给其他员工。',
  'employee.deleteReadOnly': '办公室当前为只读，无法删除员工：{message}',
  'employee.cancel': '取消',
  'employee.close': '关闭',
}

export const en: LocaleDictOf<'phoenix.office'> = {
  'employee.create': 'Create employee',
  'employee.delete': 'Delete employee',
  'employee.deleteTitle': 'Delete “{name}”?',
  'employee.deleteDescription': 'The employee will be removed from the office and group chats. Existing conversations will be archived.',
  'employee.deletePending': 'Deleting…',
  'employee.deleteFailed': 'Could not delete employee: {message}',
  'employee.deleteProtected': 'Assign another employee as chief in employee management before deleting this employee.',
  'employee.deleteReadOnly': 'The office is currently read-only: {message}',
  'employee.cancel': 'Cancel',
  'employee.close': 'Close',
}
