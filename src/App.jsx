import { Button, Form, Input, Modal, Table, Tag, DatePicker, Select, Space, message, Card, Statistic } from 'antd'
import React, { useEffect, useState } from 'react'
import "animate.css"
import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc, query, where } from 'firebase/firestore'
import {db,auth} from './config/firbase-config'
import moment from 'moment'
import { Edit2, Trash2, Plus, CheckCircle, Clock, Search } from 'lucide-react'
import { LogoutOutlined } from '@ant-design/icons'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import Login from './components/Login'
import {  Eye } from 'lucide-react'
const { TextArea } = Input
const { Option } = Select

const App = () => {
  const [open, setOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const [form] = Form.useForm()
  const [tasks, setTasks] = useState([])
  const [filteredTasks, setFilteredTasks] = useState([])
  const [updateCount, setUpdateCount] = useState(0)
  const [editId, setEditId] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const TasksCollection = collection(db, "tasks")

  // Authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const handleLogout = async () => {
    try {
      await signOut(auth)
      message.success("Logged out successfully")
    } catch (err) {
      message.error(err.message)
    }
  }

  const handleClose = () => {
    setOpen(false)
    form.resetFields()
    setEditId(null)
  }


  const fetchTasks = async () => {
    if (!user) return

    try {
      const q = query(TasksCollection, where("userId", "==", user.uid))
      const res = await getDocs(q)
      const data = res.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }))

      // Sort by createdAt descending (newest first)
      data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

      setTasks(data)
      applyFilters(data, searchTerm, statusFilter)
    } catch (err) {
      message.error(err.message)
    }
  }

  const applyFilters = (taskList, search, status) => {
    let filtered = taskList

    // Apply search filter
    if (search) {
      filtered = filtered.filter(task =>
        task.title?.toLowerCase().includes(search.toLowerCase()) ||
        task.description?.toLowerCase().includes(search.toLowerCase())
      )
    }

    // Apply status filter
    if (status !== 'all') {
      filtered = filtered.filter(task => task.status === status)
    }

    setFilteredTasks(filtered)
  }

  const deleteTask = async (id) => {
    try {
      const docRef = doc(db, "tasks", id)
      await deleteDoc(docRef)
      message.success("Task deleted successfully")
      setUpdateCount(updateCount + 1)
    } catch (err) {
      message.error(err.message)
    }
  }

  const editTask = (values) => {
    setOpen(true)
    form.setFieldsValue({
      ...values,
      dueDate: values.dueDate ? moment(values.dueDate) : null
    })
    setEditId(values.id)
  }
const createTask = async (values) => {
  try {
    // ✅ Clean the values - remove undefined fields
    const cleanedValues = Object.keys(values).reduce((acc, key) => {
      if (values[key] !== undefined && values[key] !== null && values[key] !== '') {
        acc[key] = values[key]
      }
      return acc
    }, {})

    // ✅ Handle dueDate properly - convert moment to ISO string or omit if undefined
    if (cleanedValues.dueDate) {
      cleanedValues.dueDate = moment(cleanedValues.dueDate).toISOString()
    }

    const taskData = {
      title: cleanedValues.title || 'Untitled Task',
      description: cleanedValues.description || '',
      priority: cleanedValues.priority || 'medium',
      category: cleanedValues.category || 'general',
      status: cleanedValues.status || 'pending',
      userId: user.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // ✅ Only add dueDate if it exists
    if (cleanedValues.dueDate) {
      taskData.dueDate = cleanedValues.dueDate
    }

    await addDoc(TasksCollection, taskData)
    setUpdateCount(updateCount + 1)
    message.success("Task created successfully")
    handleClose()
  } catch (err) {
    message.error(err.message)
  }
}

const saveTask = async (values) => {
  try {
    // ✅ Clean the values - remove undefined fields
    const cleanedValues = Object.keys(values).reduce((acc, key) => {
      if (values[key] !== undefined && values[key] !== null && values[key] !== '') {
        acc[key] = values[key]
      }
      return acc
    }, {})

    // ✅ Handle dueDate properly
    if (cleanedValues.dueDate) {
      cleanedValues.dueDate = moment(cleanedValues.dueDate).toISOString()
    }

    const taskData = {
      title: cleanedValues.title || 'Untitled Task',
      description: cleanedValues.description || '',
      priority: cleanedValues.priority || 'medium',
      category: cleanedValues.category || 'general',
      status: cleanedValues.status || 'pending',
      updatedAt: new Date().toISOString()
    }

    // ✅ Only add dueDate if it exists, otherwise explicitly set to null
    if (cleanedValues.dueDate) {
      taskData.dueDate = cleanedValues.dueDate
    } else {
      taskData.dueDate = null // Firestore accepts null
    }

    const docRef = doc(db, "tasks", editId)
    await updateDoc(docRef, taskData)
    message.success("Task updated successfully")
    setUpdateCount(updateCount + 1)
    handleClose()
  } catch (err) {
    message.error(err.message)
  }
}


  const toggleTaskStatus = async (task) => {
    try {
      const docRef = doc(db, "tasks", task.id)
      const newStatus = task.status === 'completed' ? 'pending' : 'completed'
      await updateDoc(docRef, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      })
      message.success(`Task marked as ${newStatus}`)
      setUpdateCount(updateCount + 1)
    } catch (err) {
      message.error(err.message)
    }
  }

  useEffect(() => {
    if (user) {
      fetchTasks()
    }
  }, [updateCount, user])

  useEffect(() => {
    applyFilters(tasks, searchTerm, statusFilter)
  }, [searchTerm, statusFilter, tasks])

  const getStatusColor = (status) => {
    return status === 'completed' ? 'success' : 'warning'
  }

  const getPriorityColor = (priority) => {
    const colors = {
      high: 'red',
      medium: 'orange',
      low: 'green'
    }
    return colors[priority] || 'default'
  }

  // ✅ FIXED: Safe date formatting function
  const formatDate = (dateValue) => {
    if (!dateValue) return 'No deadline'

    try {
      // Handle Firestore Timestamp
      if (dateValue.toDate && typeof dateValue.toDate === 'function') {
        return moment(dateValue.toDate()).format('DD MMM YYYY')
      }
      // Handle ISO string or Date object
      return moment(dateValue).format('DD MMM YYYY')
    } catch (error) {
      return 'Invalid date'
    }
  }

  // ✅ FIXED: Safe created date formatting
  const formatCreatedDate = (dateValue) => {
    if (!dateValue) return 'N/A'

    try {
      if (dateValue.toDate && typeof dateValue.toDate === 'function') {
        return moment(dateValue.toDate()).format('DD MMM YYYY, hh:mm A')
      }
      return moment(dateValue).format('DD MMM YYYY, hh:mm A')
    } catch (error) {
      return 'Invalid date'
    }
  }
const viewTask = (task) => {
  setSelectedTask(task)
  setViewOpen(true)
}
  const columns = [
    {
      key: 'title',
      dataIndex: 'title',
      title: 'Task',
      width: 200,
      render: (text, record) => (
        <div>
          <div className='font-medium'>{text}</div>
          <div className='text-xs text-gray-500'>{record.description?.substring(0, 50)}...</div>
        </div>
      )
    },
    {
      key: 'priority',
      dataIndex: 'priority',
      title: 'Priority',
      width: 100,
      render: (priority) => (
        <Tag color={getPriorityColor(priority)}>
          {priority?.toUpperCase() || 'MEDIUM'}
        </Tag>
      )
    },
    {
      key: 'status',
      dataIndex: 'status',
      title: 'Status',
      width: 120,
      render: (status) => (
        <Tag color={getStatusColor(status)} icon={status === 'completed' ? <CheckCircle className='w-3 h-3' /> : <Clock className='w-3 h-3' />}>
          {status?.toUpperCase()}
        </Tag>
      )
    },
    {
      key: 'dueDate',
      dataIndex: 'dueDate',
      title: 'Due Date',
      width: 150,
      render: (date) => formatDate(date) // ✅ Use safe formatter
    },
    {
      key: 'category',
      dataIndex: 'category',
      title: 'Category',
      width: 120,
      render: (category) => category || 'General'
    },
    {
      key: 'createdAt',
      title: 'Created',
      width: 160,
      render: (values) => formatCreatedDate(values.createdAt) // ✅ Use safe formatter
    },{
  key: 'actions',
  title: 'Actions',
  fixed: 'right',
  width: 180,
  render: (values) => (
    <Space>
      <Button
        onClick={() => viewTask(values)}
        icon={<Eye className='w-4 h-4' />}
        size='small'
      />
      <Button
        onClick={() => toggleTaskStatus(values)}
        type={values.status === 'completed' ? 'default' : 'primary'}
        size='small'
      >
        {values.status === 'completed' ? 'Undo' : 'Complete'}
      </Button>
      <Button
        onClick={() => editTask(values)}
        icon={<Edit2 className='w-4 h-4' />}
        size='small'
      />
      <Button
        onClick={() => deleteTask(values.id)}
        icon={<Trash2 className='w-4 h-4' />}
        danger
        size='small'
      />
    </Space>
  )
}
  ]

  // Statistics
  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    pending: tasks.filter(t => t.status === 'pending').length,
    highPriority: tasks.filter(t => t.priority === 'high').length
  }

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-lg'>Loading...</div>
      </div>
    )
  }

  if (!user) {
    return <Login onLogin={() => setUpdateCount(c => c + 1)} />
  }

  return (
    <div className='bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen py-8'>
      <div className='animate__animated animate__fadeIn bg-white rounded-2xl p-8 shadow-xl w-11/12 mx-auto space-y-6'>

        {/* Header */}
        <div className='flex justify-between items-center border-b pb-4'>
          <div>
            <h1 className='text-3xl font-bold text-gray-800'>Task Manager</h1>
            <p className='text-gray-500 mt-1'>Welcome back, {user?.email}</p>
          </div>
          <Space>
            <Button
              size='large'
              type='primary'
              onClick={() => setOpen(true)}
              icon={<Plus className='w-4 h-4' />}
            >
              Add Task
            </Button>
            <Button
              size='large'
              onClick={handleLogout}
              icon={<LogoutOutlined />}
              danger
            >
              Logout
            </Button>
          </Space>
        </div>

        {/* ✅ FIXED: Statistics Cards with new API */}
        <div className='grid grid-cols-4 gap-4'>
          <Card size='small'>
            <Statistic
              title="Total Tasks"
              value={stats.total}
            />
          </Card>
          <Card size='small'>
            <Statistic
              title="Completed"
              value={stats.completed}
              styles={{ content: { color: '#3f8600' } }} // ✅ New API
            />
          </Card>
          <Card size='small'>
            <Statistic
              title="Pending"
              value={stats.pending}
              styles={{ content: { color: '#cf1322' } }} // ✅ New API
            />
          </Card>
          <Card size='small'>
            <Statistic
              title="High Priority"
              value={stats.highPriority}
              styles={{ content: { color: '#ff4d4f' } }} // ✅ New API
            />
          </Card>
        </div>

        {/* Filters */}
        <div className='flex gap-4'>
          <Input
            placeholder='Search tasks...'
            prefix={<Search className='w-4 h-4 text-gray-400' />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='w-64'
            allowClear
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            className='w-32'
          >
            <Option value="all">All Tasks</Option>
            <Option value="pending">Pending</Option>
            <Option value="completed">Completed</Option>
          </Select>
        </div>

        {/* Tasks Table */}
        <Table
          columns={columns}
          dataSource={filteredTasks}
          scroll={{ x: 'max-content' }}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Total ${total} tasks`
          }}
        />

        {/* Add/Edit Task Modal */}
        <Modal
          open={open}
          footer={null}
          onCancel={handleClose}
          title={editId ? 'Edit Task' : 'Create New Task'}
          width={600}
        >
          <Form
            form={form}
            onFinish={editId ? saveTask : createTask}
            layout='vertical'
            initialValues={{
              priority: 'medium',
              category: 'general',
              status: 'pending'
            }}
          >
            <Form.Item
              name="title"
              label="Task Title"
              rules={[{ required: true, message: 'Please enter task title' }]}
            >
              <Input size='large' placeholder='Enter task title' />
            </Form.Item>

            <Form.Item
              name="description"
              label="Description"
            >
              <TextArea
                rows={3}
                placeholder='Enter task description (optional)'
              />
            </Form.Item>

            <div className='grid grid-cols-2 gap-4'>
              <Form.Item
                name="priority"
                label="Priority"
              >
                <Select size='large'>
                  <Option value="low">Low</Option>
                  <Option value="medium">Medium</Option>
                  <Option value="high">High</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="category"
                label="Category"
              >
                <Select size='large'>
                  <Option value="work">Work</Option>
                  <Option value="personal">Personal</Option>
                  <Option value="shopping">Shopping</Option>
                  <Option value="health">Health</Option>
                  <Option value="other">Other</Option>
                </Select>
              </Form.Item>
            </div>

            <Form.Item
              name="dueDate"
              label="Due Date"
            >
              <DatePicker
                size='large'
                className='w-full'
                format="YYYY-MM-DD HH:mm"
                showTime
                placeholder='Select due date and time'
              />
            </Form.Item>

            <Form.Item
              name="status"
              label="Status"
            >
              <Select size='large'>
                <Option value="pending">Pending</Option>
                <Option value="completed">Completed</Option>
              </Select>
            </Form.Item>

            <Form.Item className='mb-0'>
              <Space className='w-full justify-end'>
                <Button size='large' onClick={handleClose}>
                  Cancel
                </Button>
                <Button size='large' type='primary' htmlType='submit'>
                  {editId ? 'Update Task' : 'Create Task'}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
        {/* View Task Detail Modal */}
<Modal
  open={viewOpen}
  onCancel={() => setViewOpen(false)}
  footer={null}
  title="Task Details"
  width={600}
>
  {selectedTask && (
    <div className="space-y-4">
      <div className="border-b pb-3">
        <h2 className="text-2xl font-bold">{selectedTask.title}</h2>
        <div className="flex gap-2 mt-2">
          <Tag color={selectedTask.status === 'completed' ? 'success' : 'warning'}>
            {selectedTask.status?.toUpperCase()}
          </Tag>
          <Tag color={
            selectedTask.priority === 'high' ? 'red' :
            selectedTask.priority === 'medium' ? 'orange' : 'green'
          }>
            {selectedTask.priority?.toUpperCase() || 'MEDIUM'}
          </Tag>
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-gray-600 mb-2">Description</h4>
        <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">
          {selectedTask.description || 'No description provided'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold text-gray-600 mb-1">Category</h4>
          <p className="text-gray-700">{selectedTask.category || 'General'}</p>
        </div>
        <div>
          <h4 className="font-semibold text-gray-600 mb-1">Due Date</h4>
          <p className="text-gray-700">
            {selectedTask.dueDate ? moment(selectedTask.dueDate).format('DD MMM YYYY, hh:mm A') : 'No deadline'}
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-gray-600 mb-1">Created</h4>
          <p className="text-gray-700">
            {selectedTask.createdAt ? moment(selectedTask.createdAt).format('DD MMM YYYY, hh:mm A') : 'N/A'}
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-gray-600 mb-1">Last Updated</h4>
          <p className="text-gray-700">
            {selectedTask.updatedAt ? moment(selectedTask.updatedAt).format('DD MMM YYYY, hh:mm A') : 'N/A'}
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button
          onClick={() => {
            setViewOpen(false)
            editTask(selectedTask)
          }}
          icon={<Edit2 className="w-4 h-4" />}
        >
          Edit
        </Button>
        <Button onClick={() => setViewOpen(false)}>
          Close
        </Button>
      </div>
    </div>
  )}
</Modal>
      </div>
    </div>
  )
}

export default App