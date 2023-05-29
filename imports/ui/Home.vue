<script setup>
// Csllections
import FilesCollection from '/imports/api/files/files'
import { onMounted, ref } from 'vue'

const file = ref('')
const fileData = ref([])

const uploadToServer = () => {
  FilesCollection.insert({
    file: file.value,
    chunkSize: 'dynamic',
    // onBeforeUpload(file) {
    //   // Allow upload files under 1MB, and only in png/jpg/jpeg formats
    //   if (file.size <= 2000 && /png|jpg|jpeg/i.test(file.extension)) {
    //     return true
    //   }
    //   return 'Please upload image, with size equal or less than 2MB'
    // },
    onUploaded(err, fileObj) {
      if (err) {
        console.log('error', err)
      } else {
        file.value = ''
        getFileUploads()
      }
    },
  })
}

const handleChange = ($event) => {
  const target = $event.target
  if (target && target.files) {
    file.value = target.files[0]
    // uploadToServer(target.files[0])
  }
}
const handleUpload = () => {
  if (!file.value) {
    alert('file required.')
    return false
  }
  uploadToServer()
}

const getFileUploads = () => {
  Meteor.call('findImageData', (err, res) => {
    if (err) {
      console.log('error', err)
    } else {
      console.log('res', res)
      fileData.value = res
    }
  })
}

const removeFile = (id) => {
  console.log('id', id)
  FilesCollection.remove({ _id: id }, (err) => {
    if (!err) {
      getFileUploads()
    } else {
      console.log(err)
    }
  })
}

onMounted(() => {
  getFileUploads()
})
</script>

<template>
  <h1 class="text-3xl font-bold my-6">File Uploads</h1>
  <ul>
    <li v-for="file in fileData" :key="file._id">
      <img :src="file.url" style="width: 125px; height: 125px" />
      <button type="button" @click="removeFile(file._id)">X</button>
    </li>
  </ul>
  <hr class="mb-2" />
  <input type="file" @change="handleChange" />
  <button
    class="bg-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-1 px-4 border border-blue-500 hover:border-transparent rounded"
    type="button"
    @click="handleUpload"
    v-if="file"
  >
    Upload
  </button>
</template>
