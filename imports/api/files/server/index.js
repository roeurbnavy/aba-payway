import Files from '../files'
import '../methods'

Files.allow({
  insert() {
    return true
  },
  update() {
    return true
  },
  remove() {
    return true
  },
})
