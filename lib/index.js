"use strict"

const axios = require("axios")
const { ApplicationError } = require("@strapi/utils").errors

const DEFAULT_UPLOAD_LIMIT_MB = 200

module.exports = {
  init({ api_key, storage_zone, pull_zone, max_content_length, max_body_length  }) {
    if (!api_key || !storage_zone || !pull_zone) {
      throw new ApplicationError("BUNNY_API_KEY, BUNNY_STORAGE_ZONE or BUNNY_PULL_ZONE can't be null or undefined.")
    }

    const bunny_api = axios.create({
      baseURL: `https://storage.bunnycdn.com/${storage_zone}/`,
      timeout: 0,
      headers: {
        AccessKey: api_key,
        "content-type": "application/octet-stream",
      },
      maxContentLength: max_content_length || (1024 * 1024 * DEFAULT_UPLOAD_LIMIT_MB),
      maxBodyLength: max_body_length || (1024 * 1024 * DEFAULT_UPLOAD_LIMIT_MB)
    })

    const upload = (file) =>
      new Promise(async (resolve, reject) => {
        const data = file.stream || Buffer.from(file.buffer, "binary")
        try {
          const response = await bunny_api.put(`${file.hash}${file.ext}`, data)

          if (response.data.HttpCode !== 201) {
            reject(new Error(`Error uploading to Bunny.net: ${error.message}`))
          }

          file.url = `${pull_zone}/${file.hash}${file.ext}`
          resolve()
        } catch (error) {
          reject(new Error(`Error uploading to Bunny.net: ${error.message}`))
        }
      })

    return {
      upload(file) {
        return upload(file)
      },
      uploadStream(file) {
        return upload(file)
      },
      delete: async (file) => {
        return new Promise(async (resolve, reject) => {
          try {
            const response = await bunny_api.delete(`${file.hash}${file.ext}`)

            if (response.data.HttpCode !== 200) {
              console.error("Soft Error: Failed to delete file; has it already been deleted?", response.data)
              resolve()
            }

            resolve()
          } catch (error) {
            console.error("Soft Error: Failed to delete file; has it already been deleted?", error.message)
            resolve()
          }
        })
      },
    }
  },
}
