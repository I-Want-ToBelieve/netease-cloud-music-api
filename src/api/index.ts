import { Response, Router } from 'farrow-http'
import { service as TodoService } from './todo'
import is from '@sindresorhus/is'

export const services = Router()

// capture json response and do something if needed
services.capture('json', (body) => {
  if (is.plainObject(body.value)) {
    return Response.json({
      ...body.value,
    })
  }
  return Response.json(body.value)
})

// attach todo api
services.route('/api/todo').use(TodoService)
