'use client'
import type { DropResult } from '@hello-pangea/dnd'
import { yupResolver } from '@hookform/resolvers/yup'
import { createContext, startTransition, use, useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import * as yup from 'yup'

import type { ChildrenType } from '@/types/component-props'
import type { KanbanDialogType, KanbanType } from '@/types/context'
import type { KanbanSectionType, KanbanTaskType } from '@/types/data'

const ThemeContext = createContext<KanbanType | undefined>(undefined)

export const kanbanTaskSchema = yup.object({
  title: yup.string().required('Please enter task title'),
  description: yup.string().optional(),
})

export type TaskFormFields = yup.InferType<typeof kanbanTaskSchema>

export const kanbanSectionSchema = yup.object({
  sectionTitle: yup.string().required('Section title is required'),
})

export type SectionFormFields = yup.InferType<typeof kanbanSectionSchema>

const useKanbanContext = () => {
  const context = use(ThemeContext)
  if (!context) {
    throw new Error('useKanbanContext can only be used within KanbanProvider')
  }
  return context
}

const KanbanProvider = ({ children }: ChildrenType) => {
  const [sections, setSections] = useState<KanbanSectionType[]>([])
  const [tasks, setTasks] = useState<KanbanTaskType[]>([])
  const [activeSectionId, setActiveSectionId] = useState<KanbanSectionType['id']>()
  const [activeTaskId, setActiveTaskId] = useState<KanbanTaskType['id']>()
  const [taskFormData, setTaskFormData] = useState<KanbanTaskType>()
  const [sectionFormData, setSectionFormData] = useState<KanbanSectionType>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogStates, setDialogStates] = useState<KanbanDialogType>({
    showNewTaskModal: false,
    showSectionModal: false,
  })

  const {
    control: newTaskControl,
    handleSubmit: newTaskHandleSubmit,
    reset: newTaskReset,
  } = useForm({
    resolver: yupResolver(kanbanTaskSchema),
  })

  const {
    control: sectionControl,
    handleSubmit: sectionHandleSubmit,
    reset: sectionReset,
  } = useForm({
    resolver: yupResolver(kanbanSectionSchema),
  })

  const emptySectionForm = useCallback(() => {
    sectionReset({ sectionTitle: '' })
  }, [sectionReset])

  const emptyTaskForm = useCallback(() => {
    newTaskReset({
      title: '',
      description: '',
    })
  }, [newTaskReset])

  const toggleNewTaskModal = useCallback(
    (sectionId?: KanbanSectionType['id'], taskId?: KanbanTaskType['id']) => {
      if (sectionId) setActiveSectionId(sectionId)
      if (taskId) {
        const foundTask = tasks.find((task) => task.id === taskId)
        if (foundTask) {
          newTaskReset({
            title: foundTask.title,
            description: foundTask.description,
          })
          startTransition(() => {
            setActiveTaskId(taskId)
          })
          startTransition(() => {
            setTaskFormData(foundTask)
          })
        }
      }
      if (dialogStates.showNewTaskModal) emptyTaskForm()
      startTransition(() => {
        setDialogStates({ ...dialogStates, showNewTaskModal: !dialogStates.showNewTaskModal })
      })
    },
    [dialogStates, emptyTaskForm, tasks, newTaskReset],
  )

  const toggleSectionModal = useCallback(
    (sectionId?: KanbanSectionType['id']) => {
      if (sectionId) {
        const foundSection = sections.find((section) => section.id === sectionId)
        if (foundSection) {
          startTransition(() => {
            setSectionFormData(foundSection)
          })
          startTransition(() => {
            setActiveSectionId(foundSection.id)
          })
          sectionReset({
            sectionTitle: foundSection.title,
          })
        }
      }
      if (dialogStates.showSectionModal) emptySectionForm()
      startTransition(() => {
        setDialogStates({ ...dialogStates, showSectionModal: !dialogStates.showSectionModal })
      })
    },
    [dialogStates, emptySectionForm, sections, sectionReset],
  )

  const getAllTasksPerSection = useCallback(
    (id: KanbanSectionType['id']) => tasks.filter((task) => task.sectionId == id),
    [tasks],
  )

  const normalizeTasks = useCallback(
    (records: any[]): KanbanTaskType[] =>
      records.map((task) => ({
        id: task.id || task._id?.toString(),
        sectionId: task.sectionId,
        title: task.title,
        description: task.description ?? '',
        variant: task.variant ?? 'primary',
        views: task.views ?? 0,
        share: task.share ?? 0,
        commentsCount: task.commentsCount ?? 0,
        progress: task.progress ?? undefined,
        members: [],
      })),
    [],
  )

  useEffect(() => {
    let cancelled = false
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const [sectionsRes, tasksRes] = await Promise.all([fetch('/api/kanban/sections'), fetch('/api/kanban/tasks')])
        if (!sectionsRes.ok) throw new Error('Unable to load sections')
        if (!tasksRes.ok) throw new Error('Unable to load tasks')

        const [sectionsData, tasksData] = await Promise.all([sectionsRes.json(), tasksRes.json()])
        if (!cancelled) {
          setSections(sectionsData)
          setTasks(normalizeTasks(tasksData))
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Failed to load kanban board')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => {
      cancelled = true
    }
  }, [normalizeTasks])

  const persistSection = useCallback(async (method: 'POST' | 'PUT' | 'DELETE', body?: any, query?: Record<string, string>) => {
    const url = new URL('/api/kanban/sections', window.location.origin)
    if (query) {
      Object.entries(query).forEach(([key, value]) => url.searchParams.set(key, value))
    }
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!response.ok) {
      const message = await response.json().catch(() => ({}))
      throw new Error(message?.message || 'Unable to update section')
    }
    return response.json()
  }, [])

  const persistTask = useCallback(async (method: 'POST' | 'PUT' | 'DELETE', body?: any, query?: Record<string, string>) => {
    const url = new URL('/api/kanban/tasks', window.location.origin)
    if (query) {
      Object.entries(query).forEach(([key, value]) => url.searchParams.set(key, value))
    }
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!response.ok) {
      const message = await response.json().catch(() => ({}))
      throw new Error(message?.message || 'Unable to update task')
    }
    return response.json()
  }, [])

  const handleNewTask = newTaskHandleSubmit((values: TaskFormFields) => {
    const formData: TaskFormFields = {
      title: values.title,
      description: values.description,
    }

    if (!activeSectionId) return

    const optimisticId = `temp-${Date.now()}`
    const newTask: KanbanTaskType = {
      id: optimisticId,
      sectionId: activeSectionId,
      title: formData.title || 'Untitled Task',
      description: formData.description || '',
      views: 0,
      members: [],
      share: 0,
      variant: 'success',
      commentsCount: 0,
    }
    setTasks([...tasks, newTask])
    persistTask('POST', {
      sectionId: activeSectionId,
      title: newTask.title,
      description: newTask.description,
      variant: newTask.variant,
      views: newTask.views,
      share: newTask.share,
      commentsCount: newTask.commentsCount,
      progress: newTask.progress ?? null,
    })
      .then((created) => {
        setTasks((prev) => prev.map((task) => (task.id === optimisticId ? { ...newTask, id: created.id } : task)))
      })
      .catch((err: any) => {
        setTasks((prev) => prev.filter((task) => task.id !== optimisticId))
        setError(err?.message || 'Unable to create task')
      })
    startTransition(() => {
      toggleNewTaskModal()
    })
    setActiveSectionId(undefined)
    newTaskReset()
  })

  const handleEditTask = newTaskHandleSubmit((values: TaskFormFields) => {
    const formData: TaskFormFields = {
      title: values.title,
      description: values.description,
      // priority: values.priority,
      // tags: values.tags,
      totalTasks: values.totalTasks,
    }

    if (activeSectionId && activeTaskId) {
      const newTask: KanbanTaskType = {
        id: activeTaskId,
        sectionId: activeSectionId,
        title: formData.title || 'Untitled Task',
        description: formData.description || '',
        views: 0,
        members: [],
        share: 0,
        variant: 'success',
        commentsCount: 0,
      }
      setTasks(tasks.map((t) => (t.id === activeTaskId ? newTask : t)))
      persistTask('PUT', {
        id: activeTaskId,
        title: newTask.title,
        description: newTask.description,
        sectionId: activeSectionId,
      }).catch((err: any) => setError(err?.message || 'Unable to update task'))
    }
    startTransition(() => {
      toggleNewTaskModal()
    })
    startTransition(() => {
      setActiveSectionId(undefined)
    })
    startTransition(() => {
      newTaskReset()
    })
    startTransition(() => {
      setTaskFormData(undefined)
    })
  })

  const handleDeleteTask = useCallback(
    (taskId: KanbanTaskType['id']) => {
      const initialTasks = [...tasks]
      setTasks(tasks.filter((task) => task.id !== taskId))
      persistTask('DELETE', undefined, { id: taskId }).catch((err: any) => {
        setTasks(initialTasks)
        setError(err?.message || 'Unable to delete task')
      })
    },
    [tasks, persistTask],
  )

  const onDragEnd = useCallback(
    (result: DropResult) => {
      const { source, destination } = result

      if (!destination) {
        return
      }
      let sourceOccurrence = source.index
      let destinationOccurrence = destination.index

      let sourceId = 0,
        destinationId = 0

      tasks.forEach((task, index) => {
        if (task.sectionId == source.droppableId) {
          if (sourceOccurrence == 0) {
            sourceId = index
          }
          sourceOccurrence--
        }
        if (task.sectionId == destination.droppableId) {
          if (destinationOccurrence == 0) {
            destinationId = index
          }
          destinationOccurrence--
        }
      })

      const task = tasks[sourceId]
      const newTasks = tasks.filter((t) => t.id != task.id)
      task.sectionId = destination.droppableId
      const parity = destination.droppableId != source.droppableId ? -1 : 0
      const updatedTasks = [...newTasks.slice(0, destinationId + parity), task, ...newTasks.slice(destinationId + parity)]
      setTasks(updatedTasks)
      persistTask('PUT', { id: task.id, sectionId: task.sectionId }).catch((err: any) => {
        setTasks(tasks)
        setError(err?.message || 'Unable to move task')
      })
    },
    [tasks, persistTask],
  )

  const handleNewSection = sectionHandleSubmit((values: SectionFormFields) => {
    const optimisticId = `section-${Date.now()}`
    const section: KanbanSectionType = {
      id: optimisticId,
      title: values.sectionTitle,
    }
    setSections([...sections, section])
    persistSection('POST', { title: values.sectionTitle })
      .then((created) => {
        setSections((prev) => prev.map((item) => (item.id === optimisticId ? created : item)))
      })
      .catch((err: any) => {
        setSections((prev) => prev.filter((item) => item.id !== optimisticId))
        setError(err?.message || 'Unable to create section')
      })
    startTransition(() => {
      toggleSectionModal()
    })
    sectionReset()
  })

  const handleEditSection = sectionHandleSubmit((values: SectionFormFields) => {
    if (activeSectionId) {
      const newSection = {
        id: activeSectionId,
        title: values.sectionTitle,
      }
      setSections(
        sections.map((section) => {
          return section.id === activeSectionId ? newSection : section
        }),
      )
      persistSection('PUT', { id: activeSectionId, title: values.sectionTitle }).catch((err: any) =>
        setError(err?.message || 'Unable to update section'),
      )
    }
    startTransition(() => {
      toggleSectionModal()
    })
    sectionReset()
  })

  const handleDeleteSection = useCallback(
    (sectionId: KanbanSectionType['id']) => {
      const initialSections = [...sections]
      setSections(sections.filter((section) => section.id !== sectionId))
      persistSection('DELETE', undefined, { id: sectionId }).catch((err: any) => {
        setSections(initialSections)
        setError(err?.message || 'Unable to delete section')
      })
    },
    [sections, persistSection],
  )

  return (
    <ThemeContext.Provider
      value={useMemo(
        () => ({
          sections,
          activeSectionId,
          taskFormData,
          sectionFormData,
          newTaskModal: {
            open: dialogStates.showNewTaskModal,
            toggle: toggleNewTaskModal,
          },
          sectionModal: {
            open: dialogStates.showSectionModal,
            toggle: toggleSectionModal,
          },
          taskForm: {
            control: newTaskControl,
            newRecord: handleNewTask,
            editRecord: handleEditTask,
            deleteRecord: handleDeleteTask,
          },
          sectionForm: {
            control: sectionControl,
            newRecord: handleNewSection,
            editRecord: handleEditSection,
            deleteRecord: handleDeleteSection,
          },
          getAllTasksPerSection,
          onDragEnd,
          loading,
          error,
        }),
        [
          sections,
          activeSectionId,
          taskFormData,
          sectionFormData,
          dialogStates,
          loading,
          error,
          getAllTasksPerSection,
          toggleNewTaskModal,
          toggleSectionModal,
          handleNewTask,
          handleEditTask,
          handleDeleteTask,
          handleNewSection,
          handleEditSection,
          handleDeleteSection,
          onDragEnd,
          newTaskControl,
          sectionControl,
        ],
      )}>
      {children}
    </ThemeContext.Provider>
  )
}

export { KanbanProvider, useKanbanContext }
