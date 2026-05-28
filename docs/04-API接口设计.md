# API 接口设计

**版本**：V1.0
**编制日期**：2026年5月28日

本文档描述数据质量校验工具的所有 API 接口。接口基于 Next.js 15 App Router 的 API Routes（`app/api/...`）。

## 通用约定

### 请求格式
- Content-Type: `application/json`（文件上传除外）
- 文件上传：`multipart/form-data`

### 响应格式

**成功响应**：
```json
{
  "success": true,
  "data": { ... }
}
```

**错误响应**：
```json
{
  "success": false,
  "error": {
    "code": "INVALID_PARAM",
    "message": "参数 domainId 不能为空"
  }
}
```

### 通用错误码

| 错误码 | 说明 |
|--------|------|
| `INVALID_PARAM` | 请求参数错误 |
| `NOT_FOUND` | 资源不存在 |
| `CONFLICT` | 资源冲突（如重复名称） |
| `FORBIDDEN` | 权限不足 |
| `INTERNAL_ERROR` | 服务器内部错误 |
| `AI_SERVICE_ERROR` | AI 服务调用失败 |
| `FILE_ERROR` | 文件处理失败 |
| `VALIDATION_FAILED` | 校验失败 |

### 分页请求参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | number | 1 | 页码 |
| pageSize | number | 20 | 每页条数 |

### 分页响应格式

```json
{
  "success": true,
  "data": {
    "items": [ ... ],
    "total": 150,
    "page": 1,
    "pageSize": 20,
    "totalPages": 8
  }
}
```

---

## 一、业务域 API (`/api/domains`)

### 1.1 获取所有业务域

- **方法**：`GET`
- **路径**：`/api/domains`
- **描述**：获取所有业务域列表，包含关联统计信息
- **查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | string | 否 | 过滤状态：`active` / `inactive` |

- **响应**：

```json
{
  "success": true,
  "data": [
    {
      "id": "hr",
      "name": "人力资源",
      "description": "HR 相关数据标准与校验",
      "status": "active",
      "standardCount": 5,
      "assetCount": 12,
      "taskCount": 8,
      "createdAt": "2026-05-20T10:00:00Z",
      "updatedAt": "2026-05-25T14:30:00Z"
    }
  ]
}
```

### 1.2 创建业务域

- **方法**：`POST`
- **路径**：`/api/domains`
- **描述**：创建新的业务域
- **请求体**：

```json
{
  "id": "finance",
  "name": "财务管理",
  "description": "财务数据相关标准与校验"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 业务域唯一标识（英文/数字/下划线） |
| name | string | 是 | 业务域显示名称 |
| description | string | 否 | 业务域描述 |

- **响应**：

```json
{
  "success": true,
  "data": {
    "id": "finance",
    "name": "财务管理",
    "description": "财务数据相关标准与校验",
    "status": "active",
    "createdAt": "2026-05-28T08:00:00Z",
    "updatedAt": "2026-05-28T08:00:00Z"
  }
}
```

### 1.3 更新业务域

- **方法**：`PUT`
- **路径**：`/api/domains/[id]`
- **描述**：更新业务域信息
- **请求体**：

```json
{
  "name": "财务管理（更新）",
  "description": "更新后的描述",
  "status": "inactive"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 否 | 新名称 |
| description | string | 否 | 新描述 |
| status | string | 否 | `active` / `inactive` |

- **响应**：同 1.2 响应

### 1.4 删除业务域

- **方法**：`DELETE`
- **路径**：`/api/domains/[id]`
- **描述**：删除业务域。如果存在关联的标准、素材或任务，则阻止删除并返回错误
- **响应**：

```json
{
  "success": true,
  "data": { "message": "业务域已删除" }
}
```

**删除被阻止时**：

```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "该业务域下存在 3 个标准、5 个素材，请先清理关联数据"
  }
}
```

---

## 二、数据标准 API (`/api/standards`)

### 2.1 标准列表（分页）

- **方法**：`GET`
- **路径**：`/api/standards`
- **描述**：获取标准列表，支持按业务域和状态筛选
- **查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| domainId | string | 否 | 按业务域过滤 |
| status | string | 否 | `pending` / `parsing` / `parsed` / `confirmed` / `rejected` |
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页条数，默认 20 |

- **响应**：

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "std_hr_001",
        "domainId": "hr",
        "name": "HR数据标准.xlsx",
        "displayName": "HR数据标准_v1",
        "version": 1,
        "fileSize": 204800,
        "parseStatus": "confirmed",
        "totalRules": 85,
        "confirmedRules": 80,
        "createdAt": "2026-05-20T10:00:00Z",
        "updatedAt": "2026-05-21T14:00:00Z"
      }
    ],
    "total": 5,
    "page": 1,
    "pageSize": 20,
    "totalPages": 1
  }
}
```

### 2.2 上传标准

- **方法**：`POST`
- **路径**：`/api/standards`
- **描述**：上传标准 Excel 文件，系统自动解析文件、计算 MD5、创建标准记录
- **Content-Type**：`multipart/form-data`
- **表单字段**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file | File | 是 | Excel 文件（.xlsx/.xls） |
| domainId | string | 是 | 所属业务域 ID |

- **响应**：

```json
{
  "success": true,
  "data": {
    "id": "std_hr_002",
    "domainId": "hr",
    "name": "HR数据标准.xlsx",
    "displayName": "HR数据标准_v2",
    "version": 2,
    "filePath": "/uploads/standards/std_hr_002.xlsx",
    "fileSize": 204800,
    "fileHash": "a1b2c3d4e5f6...",
    "parseStatus": "pending",
    "totalRules": 0,
    "confirmedRules": 0,
    "createdAt": "2026-05-28T08:00:00Z",
    "updatedAt": "2026-05-28T08:00:00Z"
  }
}
```

### 2.3 标准详情

- **方法**：`GET`
- **路径**：`/api/standards/[id]`
- **描述**：获取标准详情，包含关联规则数量统计
- **响应**：

```json
{
  "success": true,
  "data": {
    "id": "std_hr_001",
    "domainId": "hr",
    "name": "HR数据标准.xlsx",
    "displayName": "HR数据标准_v1",
    "version": 1,
    "fileSize": 204800,
    "fileHash": "a1b2c3d4e5f6...",
    "parseStatus": "confirmed",
    "totalRules": 85,
    "confirmedRules": 80,
    "ruleStats": {
      "pending": 5,
      "confirmed": 80,
      "rejected": 0,
      "modified": 0
    },
    "levelStats": {
      "field": 60,
      "record": 15,
      "cross_dataset": 10
    },
    "createdAt": "2026-05-20T10:00:00Z",
    "updatedAt": "2026-05-21T14:00:00Z"
  }
}
```

### 2.4 更新标准

- **方法**：`PUT`
- **路径**：`/api/standards/[id]`
- **描述**：更新标准信息（如显示名称）
- **请求体**：

```json
{
  "displayName": "HR数据标准_v1（修订）"
}
```

### 2.5 删除标准

- **方法**：`DELETE`
- **路径**：`/api/standards/[id]`
- **描述**：删除标准及其关联的所有规则（级联删除）
- **响应**：

```json
{
  "success": true,
  "data": {
    "message": "标准已删除，同时删除 85 条关联规则"
  }
}
```

---

## 三、规则解析 API (`/api/standards/[id]/parse`)

### 3.1 触发 AI 解析

- **方法**：`POST`
- **路径**：`/api/standards/[id]/parse`
- **描述**：触发 AI 解析标准文件，异步处理。调用此接口后标准状态变为 `parsing`，解析完成后状态变为 `parsed`
- **请求体**：（可选）

```json
{
  "model": "qwen-plus"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| model | string | 否 | 指定 AI 模型，默认使用系统配置 |

- **响应**：

```json
{
  "success": true,
  "data": {
    "standardId": "std_hr_001",
    "parseStatus": "parsing",
    "message": "AI 解析任务已提交，请轮询状态"
  }
}
```

### 3.2 查询解析状态

解析状态通过 `GET /api/standards/[id]` 的 `parseStatus` 字段轮询获取。

当 `parseStatus` 变为 `parsed` 时，解析结果可通过 `GET /api/rules?standardId=xxx&status=pending` 获取。

---

## 四、规则管理 API (`/api/rules`)

### 4.1 规则列表

- **方法**：`GET`
- **路径**：`/api/rules`
- **描述**：获取规则列表，支持多维度筛选
- **查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| standardId | string | 否 | 按标准过滤 |
| status | string | 否 | `pending` / `confirmed` / `rejected` / `modified` |
| level | string | 否 | `field` / `record` / `cross_dataset` |
| dimension | string | 否 | `完整性` / `准确性` / `有效性` / `唯一性` / `一致性` |
| confidence | string | 否 | `high` / `medium` / `low` |
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页条数 |

- **响应**：

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "rule_001",
        "standardId": "std_hr_001",
        "tableName": "花名册",
        "fieldName": "工号",
        "dimension": "完整性",
        "level": "field",
        "originalText": "【完整性】工号不允许空值",
        "executableType": "not_null",
        "executableParams": {"placeholders": ["无", "-", "待补充"]},
        "severity": "error",
        "confidence": "high",
        "status": "pending",
        "sortOrder": 1,
        "createdAt": "2026-05-20T10:00:00Z",
        "updatedAt": "2026-05-20T10:00:00Z"
      }
    ],
    "total": 85,
    "page": 1,
    "pageSize": 20,
    "totalPages": 5
  }
}
```

### 4.2 编辑规则

- **方法**：`PUT`
- **路径**：`/api/rules/[id]`
- **描述**：编辑单条规则，编辑后状态自动变为 `modified`
- **请求体**：

```json
{
  "tableName": "花名册",
  "fieldName": "工号",
  "dimension": "完整性",
  "level": "field",
  "executableType": "not_null",
  "executableParams": {"placeholders": ["无", "-", "NA"]},
  "severity": "error"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| tableName | string | 否 | 表名 |
| fieldName | string | 否 | 字段名 |
| dimension | string | 否 | 维度 |
| level | string | 否 | 级别 |
| executableType | string | 否 | 可执行类型 |
| executableParams | object | 否 | 执行参数 |
| severity | string | 否 | `error` / `warning` / `info` |
| originalText | string | 否 | 原始规则文本 |
| sortOrder | number | 否 | 排序序号 |

- **响应**：返回更新后的规则对象

### 4.3 批量确认规则

- **方法**：`POST`
- **路径**：`/api/rules/batch-confirm`
- **描述**：批量确认多条规则，状态从 `pending` 或 `modified` 变为 `confirmed`
- **请求体**：

```json
{
  "ruleIds": ["rule_001", "rule_002", "rule_003"],
  "action": "confirm"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| ruleIds | string[] | 是 | 规则 ID 列表 |
| action | string | 是 | `confirm`（确认）/ `reject`（驳回） |

- **响应**：

```json
{
  "success": true,
  "data": {
    "confirmedCount": 3,
    "message": "已确认 3 条规则"
  }
}
```

### 4.4 检测规则冲突

- **方法**：`POST`
- **路径**：`/api/rules/conflict`
- **描述**：检测同一标准下同字段的多条规则是否存在逻辑冲突
- **请求体**：

```json
{
  "standardId": "std_hr_001"
}
```

- **响应**：

```json
{
  "success": true,
  "data": {
    "conflicts": [
      {
        "fieldName": "年龄",
        "rules": [
          { "id": "rule_010", "executableType": "value_range", "params": {"min": 0, "max": 150} },
          { "id": "rule_015", "executableType": "value_range", "params": {"min": 18, "max": 60} }
        ],
        "conflictType": "overlapping_range",
        "description": "字段'年龄'存在重叠的值域规则"
      }
    ],
    "totalConflicts": 1
  }
}
```

---

## 五、素材池 API (`/api/assets`)

### 5.1 素材列表

- **方法**：`GET`
- **路径**：`/api/assets`
- **描述**：获取素材资产列表
- **查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| domainId | string | 否 | 按业务域过滤 |
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页条数 |

- **响应**：

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "asset_hr_001",
        "domainId": "hr",
        "name": "2026年Q1花名册.xlsx",
        "displayName": "2026年Q1花名册_v1",
        "version": 1,
        "fileSize": 5242880,
        "fileHash": "x9y8z7w6v5u4...",
        "sheetNames": ["花名册", "历史晋升"],
        "rowCount": 15000,
        "uploadStatus": "ready",
        "createdAt": "2026-05-22T09:00:00Z",
        "updatedAt": "2026-05-22T09:05:00Z"
      }
    ],
    "total": 12,
    "page": 1,
    "pageSize": 20,
    "totalPages": 1
  }
}
```

### 5.2 素材详情

- **方法**：`GET`
- **路径**：`/api/assets/[id]`
- **描述**：获取素材详情，包含 Sheet 元数据
- **响应**：

```json
{
  "success": true,
  "data": {
    "id": "asset_hr_001",
    "domainId": "hr",
    "name": "2026年Q1花名册.xlsx",
    "displayName": "2026年Q1花名册_v1",
    "version": 1,
    "fileSize": 5242880,
    "fileHash": "x9y8z7w6v5u4...",
    "sheetNames": ["花名册", "历史晋升"],
    "rowCount": 15000,
    "columnNames": {
      "花名册": ["工号", "姓名", "部门", "岗位", "入职日期", "手机号"],
      "历史晋升": ["工号", "晋升日期", "原岗位", "现岗位", "异动类型"]
    },
    "uploadStatus": "ready",
    "createdAt": "2026-05-22T09:00:00Z",
    "updatedAt": "2026-05-22T09:05:00Z"
  }
}
```

### 5.3 删除素材

- **方法**：`DELETE`
- **路径**：`/api/assets/[id]`
- **描述**：删除素材资产及关联的上传文件
- **响应**：

```json
{
  "success": true,
  "data": { "message": "素材已删除" }
}
```

### 5.4 版本列表

- **方法**：`GET`
- **路径**：`/api/assets/[id]/versions`
- **描述**：获取同一素材的所有历史版本
- **响应**：

```json
{
  "success": true,
  "data": [
    {
      "id": "asset_hr_001",
      "displayName": "2026年Q1花名册_v1",
      "version": 1,
      "fileSize": 5242880,
      "uploadStatus": "ready",
      "createdAt": "2026-05-22T09:00:00Z"
    },
    {
      "id": "asset_hr_002",
      "displayName": "2026年Q1花名册_v2",
      "version": 2,
      "fileSize": 5250000,
      "uploadStatus": "ready",
      "createdAt": "2026-05-25T10:00:00Z"
    }
  ]
}
```

---

## 六、分块上传 API (`/api/assets/upload/`)

### 6.1 初始化上传

- **方法**：`POST`
- **路径**：`/api/assets/upload/init`
- **描述**：初始化分块上传会话。如果 fileHash 已存在，直接返回秒传结果
- **请求体**：

```json
{
  "fileName": "2026年Q1花名册.xlsx",
  "fileSize": 52428800,
  "fileHash": "a1b2c3d4e5f6...",
  "chunkSize": 5242880,
  "domainId": "hr"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| fileName | string | 是 | 文件名 |
| fileSize | number | 是 | 文件大小（字节） |
| fileHash | string | 是 | 文件 MD5 哈希 |
| chunkSize | number | 是 | 分片大小（字节），建议 5MB |
| domainId | string | 是 | 所属业务域 |

- **响应（正常）**：

```json
{
  "success": true,
  "data": {
    "sessionId": "session_xxx",
    "assetId": null,
    "fileName": "2026年Q1花名册.xlsx",
    "fileSize": 52428800,
    "fileHash": "a1b2c3d4e5f6...",
    "chunkSize": 5242880,
    "totalChunks": 10,
    "uploadedChunks": [],
    "status": "in_progress",
    "instantUpload": false
  }
}
```

- **响应（秒传命中）**：

```json
{
  "success": true,
  "data": {
    "instantUpload": true,
    "assetId": "asset_hr_001",
    "displayName": "2026年Q1花名册_v1",
    "message": "文件已存在，秒传成功"
  }
}
```

### 6.2 上传分片

- **方法**：`POST`
- **路径**：`/api/assets/upload/chunk`
- **描述**：上传单个分片
- **Content-Type**：`multipart/form-data`
- **表单字段**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| sessionId | string | 是 | 上传会话 ID |
| chunkIndex | number | 是 | 分片索引（从 0 开始） |
| file | File | 是 | 分片文件内容 |

- **响应**：

```json
{
  "success": true,
  "data": {
    "sessionId": "session_xxx",
    "chunkIndex": 0,
    "uploadedCount": 1,
    "totalChunks": 10,
    "progress": 10
  }
}
```

### 6.3 完成合并

- **方法**：`POST`
- **路径**：`/api/assets/upload/complete`
- **描述**：所有分片上传完成后，触发文件合并与素材入库
- **请求体**：

```json
{
  "sessionId": "session_xxx"
}
```

- **响应**：

```json
{
  "success": true,
  "data": {
    "assetId": "asset_hr_003",
    "displayName": "2026年Q1花名册_v3",
    "version": 3,
    "rowCount": 15000,
    "sheetNames": ["花名册", "历史晋升"],
    "uploadStatus": "ready",
    "message": "文件合并完成，素材已入库"
  }
}
```

---

## 七、校验任务 API (`/api/validation/tasks`)

### 7.1 创建任务

- **方法**：`POST`
- **路径**：`/api/validation/tasks`
- **描述**：创建新的校验任务
- **请求体**：

```json
{
  "domainId": "hr",
  "name": "2026年Q1花名册数据质量校验",
  "standardId": "std_hr_001",
  "assetIds": ["asset_hr_001", "asset_hr_002"]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| domainId | string | 是 | 所属业务域 |
| name | string | 是 | 任务名称 |
| standardId | string | 是 | 使用的标准 ID |
| assetIds | string[] | 是 | 使用的素材 ID 列表 |

- **响应**：

```json
{
  "success": true,
  "data": {
    "id": "task_001",
    "domainId": "hr",
    "name": "2026年Q1花名册数据质量校验",
    "standardId": "std_hr_001",
    "standardVersion": 1,
    "status": "draft",
    "assetIds": ["asset_hr_001", "asset_hr_002"],
    "totalRules": 80,
    "totalRecords": 0,
    "progress": 0,
    "createdAt": "2026-05-28T08:00:00Z",
    "updatedAt": "2026-05-28T08:00:00Z"
  }
}
```

### 7.2 任务列表（分页）

- **方法**：`GET`
- **路径**：`/api/validation/tasks`
- **描述**：获取校验任务列表
- **查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| domainId | string | 否 | 按业务域过滤 |
| status | string | 否 | 按状态过滤 |
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页条数 |

- **响应**：

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "task_001",
        "domainId": "hr",
        "name": "2026年Q1花名册数据质量校验",
        "standardId": "std_hr_001",
        "standardVersion": 1,
        "status": "completed",
        "progress": 100,
        "currentPhase": "已完成",
        "assetCount": 2,
        "totalRecords": 15000,
        "totalRules": 80,
        "errorCount": 120,
        "warningCount": 45,
        "infoCount": 10,
        "passRate": 99.1,
        "startedAt": "2026-05-28T09:00:00Z",
        "completedAt": "2026-05-28T09:15:00Z",
        "createdAt": "2026-05-28T08:00:00Z"
      }
    ],
    "total": 8,
    "page": 1,
    "pageSize": 20,
    "totalPages": 1
  }
}
```

### 7.3 任务详情

- **方法**：`GET`
- **路径**：`/api/validation/tasks/[taskId]`
- **描述**：获取任务详情，包含各维度执行状态和进度
- **响应**：

```json
{
  "success": true,
  "data": {
    "id": "task_001",
    "domainId": "hr",
    "name": "2026年Q1花名册数据质量校验",
    "standardId": "std_hr_001",
    "standardVersion": 1,
    "status": "running",
    "fieldLevelStatus": "completed",
    "recordLevelStatus": "running",
    "crossLevelStatus": "pending",
    "progress": 65,
    "currentPhase": "记录级校验中 (批次 8/15)",
    "assetIds": ["asset_hr_001", "asset_hr_002"],
    "fieldMappings": { "花名册": { "工号": "工号", "姓名": "姓名" } },
    "totalRecords": 15000,
    "totalRules": 80,
    "errorCount": 85,
    "warningCount": 30,
    "infoCount": 5,
    "passRate": 99.2,
    "startedAt": "2026-05-28T09:00:00Z",
    "createdAt": "2026-05-28T08:00:00Z",
    "updatedAt": "2026-05-28T09:10:00Z"
  }
}
```

### 7.4 更新任务状态

- **方法**：`PUT`
- **路径**：`/api/validation/tasks/[taskId]`
- **描述**：更新任务状态（取消任务等）
- **请求体**：

```json
{
  "action": "cancel"
}
```

| action | 说明 |
|--------|------|
| `cancel` | 取消运行中的任务 |
| `retry` | 从 checkpoint 续跑失败任务 |
| `update_name` | 更新任务名称（需同时传入 `name` 字段） |

- **响应**：

```json
{
  "success": true,
  "data": {
    "id": "task_001",
    "status": "cancelled",
    "updatedAt": "2026-05-28T09:12:00Z"
  }
}
```

---

## 八、字段匹配 API (`/api/validation/field-matching`)

### 8.1 执行字段匹配

- **方法**：`POST`
- **路径**：`/api/validation/field-matching`
- **描述**：对任务的素材列名与规则字段进行匹配。按四级策略执行：精确匹配 -> 别名匹配 -> AI 语义匹配 -> 人工确认
- **请求体**：

```json
{
  "taskId": "task_001",
  "assetSheetColumns": {
    "花名册": ["工号", "姓名", "部门", "岗位", "入职日期", "手机号"],
    "历史晋升": ["工号", "晋升日期", "原岗位", "现岗位", "异动类型"]
  },
  "ruleFields": [
    { "tableName": "花名册", "fieldName": "工号" },
    { "tableName": "花名册", "fieldName": "姓名" },
    { "tableName": "历史晋升", "fieldName": "异动类型" }
  ]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| taskId | string | 是 | 任务 ID |
| assetSheetColumns | object | 是 | 各 Sheet 的列名列表 |
| ruleFields | object[] | 是 | 规则中涉及的字段列表 |

- **响应**：

```json
{
  "success": true,
  "data": {
    "taskId": "task_001",
    "mappings": [
      {
        "sheetName": "花名册",
        "assetColumn": "工号",
        "ruleField": "工号",
        "matchMethod": "exact",
        "confidence": "high",
        "status": "matched"
      },
      {
        "sheetName": "花名册",
        "assetColumn": "姓名",
        "ruleField": "NAME",
        "matchMethod": "alias",
        "confidence": "high",
        "status": "matched"
      },
      {
        "sheetName": "历史晋升",
        "assetColumn": "异动类型",
        "ruleField": "异动类型",
        "matchMethod": "exact",
        "confidence": "high",
        "status": "matched"
      }
    ],
    "unmatchedColumns": [],
    "unmatchedFields": []
  }
}
```

### 8.2 确认字段映射

- **方法**：`POST`
- **路径**：`/api/validation/field-matching/confirm`
- **描述**：人工确认或修正字段映射关系
- **请求体**：

```json
{
  "taskId": "task_001",
  "mappings": [
    {
      "sheetName": "花名册",
      "assetColumn": "工号",
      "ruleField": "工号",
      "status": "confirmed"
    },
    {
      "sheetName": "花名册",
      "assetColumn": "部门",
      "ruleField": "所属部门",
      "status": "confirmed"
    },
    {
      "sheetName": "花名册",
      "assetColumn": "手机号",
      "ruleField": "联系电话",
      "status": "skipped"
    }
  ]
}
```

- **响应**：

```json
{
  "success": true,
  "data": {
    "taskId": "task_001",
    "status": "ready",
    "message": "字段映射已确认，任务可执行校验"
  }
}
```

---

## 九、校验执行 API (`/api/validation/execute`)

### 9.1 启动校验

- **方法**：`POST`
- **路径**：`/api/validation/execute`
- **描述**：启动校验任务执行。任务状态变为 `running`，三层校验依次执行
- **请求体**：

```json
{
  "taskId": "task_001"
}
```

- **响应**：

```json
{
  "success": true,
  "data": {
    "taskId": "task_001",
    "status": "running",
    "fieldLevelStatus": "running",
    "recordLevelStatus": "pending",
    "crossLevelStatus": "pending",
    "progress": 0,
    "currentPhase": "字段级校验启动中",
    "message": "校验任务已启动"
  }
}
```

### 9.2 查询进度

- **方法**：`GET`
- **路径**：`/api/validation/execute/[taskId]`
- **描述**：查询校验任务执行进度
- **响应**：

```json
{
  "success": true,
  "data": {
    "taskId": "task_001",
    "status": "running",
    "fieldLevelStatus": "completed",
    "recordLevelStatus": "running",
    "crossLevelStatus": "pending",
    "progress": 65,
    "currentPhase": "记录级校验中 (批次 8/15)",
    "errorCount": 85,
    "warningCount": 30,
    "infoCount": 5,
    "passRate": 99.2,
    "startedAt": "2026-05-28T09:00:00Z",
    "updatedAt": "2026-05-28T09:10:00Z"
  }
}
```

---

## 十、结果与导出 API (`/api/validation/results`)

### 10.1 获取结果

- **方法**：`GET`
- **路径**：`/api/validation/results/[taskId]`
- **描述**：获取校验结果列表及汇总统计
- **查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| severity | string | 否 | `error` / `warning` / `info` |
| phase | string | 否 | `field` / `record` / `cross_dataset` |
| sheetName | string | 否 | 按 Sheet 名称过滤 |
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页条数 |

- **响应**：

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "result_001",
        "taskId": "task_001",
        "ruleId": "rule_001",
        "phase": "field",
        "sheetName": "花名册",
        "rowIndex": 15,
        "fieldName": "工号",
        "originalValue": "",
        "severity": "error",
        "issueDescription": "工号字段为空值",
        "aiDiagnosis": "该记录工号为空，建议核查是否为离职员工残留数据",
        "aiSuggestion": "建议补充工号或确认是否应删除该记录",
        "createdAt": "2026-05-28T09:05:00Z"
      }
    ],
    "total": 175,
    "page": 1,
    "pageSize": 20,
    "totalPages": 9,
    "summary": {
      "errorCount": 120,
      "warningCount": 45,
      "infoCount": 10,
      "totalResults": 175,
      "passRate": 99.1,
      "byPhase": {
        "field": 140,
        "record": 25,
        "cross_dataset": 10
      },
      "bySeverity": {
        "error": 120,
        "warning": 45,
        "info": 10
      },
      "byDimension": {
        "完整性": 50,
        "准确性": 30,
        "有效性": 40,
        "唯一性": 20,
        "一致性": 35
      }
    }
  }
}
```

### 10.2 导出成果

- **方法**：`POST`
- **路径**：`/api/validation/results/[taskId]/export`
- **描述**：异步导出校验成果。返回导出任务 ID，前端轮询下载状态
- **请求体**：

```json
{
  "types": ["marked_excel", "summary_table", "analysis_report"]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| types | string[] | 是 | 导出类型列表 |

- **响应**（异步任务已提交）：

```json
{
  "success": true,
  "data": {
    "exportTaskId": "export_001",
    "status": "processing",
    "message": "导出任务已提交，请轮询下载状态"
  }
}
```

- **轮询下载状态**（同接口 GET 请求）：

```json
{
  "success": true,
  "data": {
    "exportTaskId": "export_001",
    "status": "completed",
    "files": [
      {
        "type": "marked_excel",
        "filePath": "/exports/task_001_marked.xlsx",
        "fileSize": 6291456,
        "downloadUrl": "/api/download/export_001_marked"
      },
      {
        "type": "summary_table",
        "filePath": "/exports/task_001_summary.xlsx",
        "fileSize": 102400,
        "downloadUrl": "/api/download/export_001_summary"
      },
      {
        "type": "analysis_report",
        "filePath": "/exports/task_001_report.md",
        "fileSize": 51200,
        "downloadUrl": "/api/download/export_001_report"
      }
    ]
  }
}
```

---

## 十一、历史记录 API (`/api/history`)

### 11.1 查询历史

- **方法**：`GET`
- **路径**：`/api/history`
- **描述**：查询操作历史记录（审计日志），支持多维度筛选
- **查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| domainId | string | 是 | 业务域 ID |
| from | string | 否 | 起始时间 ISO 8601 |
| to | string | 否 | 截止时间 ISO 8601 |
| action | string | 否 | 操作类型过滤 |
| entityType | string | 否 | 实体类型过滤 |
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页条数 |

- **响应**：

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "audit_001",
        "domainId": "hr",
        "action": "upload_standard",
        "entityType": "standard",
        "entityId": "std_hr_001",
        "detail": {
          "fileName": "HR数据标准.xlsx",
          "fileSize": 204800,
          "version": 1
        },
        "createdAt": "2026-05-20T10:00:00Z"
      },
      {
        "id": "audit_002",
        "domainId": "hr",
        "action": "execute_validation",
        "entityType": "task",
        "entityId": "task_001",
        "detail": {
          "taskName": "2026年Q1花名册数据质量校验",
          "standardVersion": 1,
          "assetCount": 2
        },
        "createdAt": "2026-05-28T09:00:00Z"
      }
    ],
    "total": 50,
    "page": 1,
    "pageSize": 20,
    "totalPages": 3
  }
}
```

---

## 十二、系统设置 API (`/api/settings`)

### 12.1 AI 配置

#### 12.1.1 获取 AI 配置

- **方法**：`GET`
- **路径**：`/api/settings/ai-config`
- **描述**：获取当前激活的 AI 配置
- **响应**：

```json
{
  "success": true,
  "data": {
    "id": "ai_config_001",
    "apiKey": "sk-****...****",
    "apiBaseUrl": "https://dashscope.aliyuncs.com/compatible-mode/v1",
    "model": "qwen-plus",
    "temperature": 0.3,
    "maxTokens": 4096,
    "isActive": true,
    "updatedAt": "2026-05-28T08:00:00Z"
  }
}
```

#### 12.1.2 更新 AI 配置

- **方法**：`PUT`
- **路径**：`/api/settings/ai-config`
- **描述**：更新 AI 配置。更新后将旧配置设为非激活状态
- **请求体**：

```json
{
  "apiKey": "sk-full-api-key-here",
  "apiBaseUrl": "https://dashscope.aliyuncs.com/compatible-mode/v1",
  "model": "qwen-plus",
  "temperature": 0.3,
  "maxTokens": 4096
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| apiKey | string | 是 | 完整 API Key |
| apiBaseUrl | string | 是 | API Base URL |
| model | string | 是 | 模型名称 |
| temperature | number | 否 | 温度参数（0-1），默认 0.3 |
| maxTokens | number | 否 | 最大 Token 数，默认 4096 |

- **响应**：返回更新后的配置（apiKey 脱敏）

#### 12.1.3 测试 AI 连接

- **方法**：`POST`
- **路径**：`/api/settings/ai-config/test`
- **描述**：测试当前 AI 配置是否可用
- **请求体**：（同 12.1.2，用于测试未保存的配置）
- **响应**：

```json
{
  "success": true,
  "data": {
    "connected": true,
    "model": "qwen-plus",
    "latency": 350,
    "message": "连接成功"
  }
}
```

### 12.2 Prompt 模板

#### 12.2.1 获取 Prompt 模板列表

- **方法**：`GET`
- **路径**：`/api/settings/prompts`
- **描述**：获取所有 Prompt 模板
- **响应**：

```json
{
  "success": true,
  "data": [
    {
      "id": "prompt_001",
      "name": "标准解析 Prompt",
      "type": "standard_parse",
      "version": 3,
      "isActive": true,
      "systemPrompt": "你是一个数据标准解析专家...",
      "userPromptTemplate": "请解析以下数据标准文件...",
      "createdAt": "2026-05-20T10:00:00Z",
      "updatedAt": "2026-05-25T14:00:00Z"
    }
  ]
}
```

#### 12.2.2 获取 Prompt 模板详情

- **方法**：`GET`
- **路径**：`/api/settings/prompts/[id]`
- **描述**：获取单个 Prompt 模板详情

#### 12.2.3 更新 Prompt 模板

- **方法**：`PUT`
- **路径**：`/api/settings/prompts/[id]`
- **描述**：更新 Prompt 模板。版本号自动 +1，旧版本保留可回退
- **请求体**：

```json
{
  "name": "标准解析 Prompt v4",
  "systemPrompt": "更新后的系统提示词...",
  "userPromptTemplate": "更新后的用户提示词模板...",
  "isActive": true
}
```

#### 12.2.4 版本回退

- **方法**：`POST`
- **路径**：`/api/settings/prompts/[id]/rollback`
- **描述**：将 Prompt 模板回退到指定版本
- **请求体**：

```json
{
  "targetVersion": 2
}
```

### 12.3 别名管理

#### 12.3.1 获取别名列表

- **方法**：`GET`
- **路径**：`/api/settings/aliases`
- **描述**：获取字段别名映射列表
- **查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| domainId | string | 否 | 按业务域过滤（含全局） |

- **响应**：

```json
{
  "success": true,
  "data": [
    {
      "id": "alias_001",
      "standardName": "NAME",
      "alias": "姓名",
      "domainId": "hr",
      "createdAt": "2026-05-20T10:00:00Z"
    }
  ]
}
```

#### 12.3.2 创建别名

- **方法**：`POST`
- **路径**：`/api/settings/aliases`
- **描述**：创建新的字段别名映射
- **请求体**：

```json
{
  "standardName": "DEPARTMENT",
  "alias": "所属部门",
  "domainId": "hr"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| standardName | string | 是 | 标准字段名 |
| alias | string | 是 | 别名 |
| domainId | string | 否 | 业务域 ID，NULL 表示全局 |

#### 12.3.3 批量导入别名

- **方法**：`POST`
- **路径**：`/api/settings/aliases/batch`
- **描述**：批量导入别名
- **请求体**：

```json
{
  "aliases": [
    { "standardName": "NAME", "alias": "姓名", "domainId": "hr" },
    { "standardName": "DEPARTMENT", "alias": "部门", "domainId": "hr" },
    { "standardName": "PHONE", "alias": "联系电话", "domainId": null }
  ]
}
```

- **响应**：

```json
{
  "success": true,
  "data": {
    "importedCount": 3,
    "duplicatesSkipped": 0,
    "errors": []
  }
}
```

#### 12.3.4 删除别名

- **方法**：`DELETE`
- **路径**：`/api/settings/aliases/[id]`
- **描述**：删除单个别名映射
- **响应**：

```json
{
  "success": true,
  "data": { "message": "别名已删除" }
}
```

---

## 十三、文件下载 API

### 13.1 下载导出文件

- **方法**：`GET`
- **路径**：`/api/download/[exportId]`
- **描述**：下载已完成的导出文件
- **响应**：文件流（`Content-Type: application/octet-stream`）

### 13.2 下载标准/素材文件

- **方法**：`GET`
- **路径**：`/api/download/standards/[standardId]`
- **路径**：`/api/download/assets/[assetId]`
- **描述**：下载原始标准文件或素材文件
- **响应**：文件流
