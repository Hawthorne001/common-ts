import * as Sequelize from 'sequelize'
import { Store, StorePair } from '@connext/types'

export class Record extends Sequelize.Model {
  public path!: string
  public value!: any

  static initialize(sequelize: Sequelize.Sequelize) {
    Record.init(
      {
        path: {
          type: Sequelize.STRING,
          primaryKey: true,
        },
        value: {
          type: Sequelize.JSONB,
          allowNull: false,
        },
      },
      { sequelize },
    )
  }
}

export class SequelizeConnextStore implements Store {
  sequelize: Sequelize.Sequelize

  constructor(sequelize: Sequelize.Sequelize) {
    this.sequelize = sequelize
  }

  async set(pairs: StorePair[], shouldBackup: boolean): Promise<void> {
    for (const pair of pairs) {
      // Wrapping the value into an object is necessary for Postgres bc the JSON column breaks
      // if you use anything other than JSON (i.e. a raw string).
      // In some cases, the cf core code is inserting strings as values instead of objects :(
      const record = Record.build({ path: pair.path, value: pair.value })
      await record.save()
    }
  }

  async get(path: string): Promise<any> {
    let res: any
    // special case for certain paths
    if (path.endsWith('channel')) {
      res = await Record.findAll({
        where: {
          path: {
            [Sequelize.Op.like]: `%${path}%`,
          },
        },
      })
      const records: { [key: string]: any } = {}
      res.forEach((record: Record): void => {
        const key = record.value.multisigAddress
        const value = record.value
        if (value !== null) {
          records[key] = value
        }
      })
      return records
    }

    res = await Record.findOne({
      where: {
        path,
      },
    })
    if (!res) {
      return undefined
    }
    return res.value
  }

  async restore(): Promise<StorePair[]> {
    throw 'Unimplemented'
  }
}