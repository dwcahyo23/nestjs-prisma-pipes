import { Test } from '@nestjs/testing';
import WherePipe from '../../src/prisma/where.pipe';

describe('WherePipe', () => {
	let pipe: WherePipe;

	beforeEach(async () => {
		const moduleRef = await Test.createTestingModule({
			providers: [WherePipe],
		}).compile();

		pipe = moduleRef.get<WherePipe>(WherePipe);
	});

	it('if transform value is empty pipe return empty json', () => {
		const result = pipe.transform('');
		expect(result).toEqual({});
	});

	it('if transform value is date should return parsed date', () => {
		const date = `date:${Date.now()}`;
		expect(pipe.transform(date)).toEqual({
			date: expect.any(String),
		});
	});

	it('if transform value is float should return parsed float', () => {
		const float = 'number: 0.0005';
		expect(pipe.transform(float)).toEqual({
			number: '0.0005',
		});
	});

	it('if transform value is string should return parsed string', () => {
		const user = 'userName: name';
		expect(pipe.transform(user)).toEqual({
			userName: 'name',
		});
	});

	it('if transform value is boolean should return parsed boolean', () => {
		const question = 'quest: true';
		expect(pipe.transform(question)).toEqual({
			quest: 'true',
		});
	});

	it('if transform value is integer should return parsed int', () => {
		const integer = 'number: 5';
		expect(pipe.transform(integer)).toEqual({
			number: '5',
		});
	});

	it('if transform value is array should return [in: array] ', () => {
		const string = 'zipCode: in array(int(111), int(222))';

		expect(pipe.transform(string)).toEqual({
			zipCode: {
				in: [111, 222]
			},
		});
	});

	it('should parse "has" from string "tags: has yellow"', () => {
		const string = 'tags: has yellow';

		expect(pipe.transform(string)).toEqual({
			tags: {
				has: "yellow",
			},
		});
	});

	it('should parse "hasEvery" from string "tags: hasEvery array(yellow, green)"', () => {
		const string = 'tags: hasEvery array(yellow, green)';

		expect(pipe.transform(string)).toEqual({
			tags: {
				hasEvery: ["yellow", "green"],
			},
		});
	});

	it('should parse "hasEvery" from string "numbers: hasEvery array(int(5), int(8))"', () => {
		const string = 'numbers: hasEvery array(int(5), int(8))';

		expect(pipe.transform(string)).toEqual({
			numbers: {
				hasEvery: [5, 8],
			},
		});
	});

	it('should parse "hasSome" from string "tags: hasSome array(yellow, green)"', () => {
		const string = 'tags: hasSome array(yellow, green)';

		expect(pipe.transform(string)).toEqual({
			tags: {
				hasSome: ["yellow", "green"],
			},
		});
	});

	it('should parse "contains" from string "tags: contains string(123)"', () => {
		const string = 'tags: contains string(123)';

		expect(pipe.transform(string)).toEqual({
			tags: {
				contains: "123"
			}
		});
	});



	it('should parse nested ".is" relation filter', () => {
		const string = 'profile.is.id: equals int(10)';

		expect(pipe.transform(string)).toEqual({
			profile: {
				is: {
					id: {
						equals: 10,
					},
				},
			},
		});
	});

	it('should parse nested ".some" relation filter', () => {
		const string = 'posts.some.title: contains string(Hello)';

		expect(pipe.transform(string)).toEqual({
			posts: {
				some: {
					title: {
						contains: 'Hello',
					},
				},
			},
		});
	});

	it('should parse nested ".every" relation filter', () => {
		const string = 'users.every.role: equals string(admin)';

		expect(pipe.transform(string)).toEqual({
			users: {
				every: {
					role: {
						equals: 'admin',
					},
				},
			},
		});
	});

	it('should parse nested ".none" relation filter', () => {
		const string = 'orders.none.status: equals string(cancelled)';

		expect(pipe.transform(string)).toEqual({
			orders: {
				none: {
					status: {
						equals: 'cancelled',
					},
				},
			},
		});
	});

	it('should parse deeply nested ".some" relation filter', () => {
		const string = 'company.is.departments.some.employees.every.name: contains string(John)';

		expect(pipe.transform(string)).toEqual({
			company: {
				is: {
					departments: {
						some: {
							employees: {
								every: {
									name: {
										contains: 'John',
									},
								},
							},
						},
					},
				},
			},
		});
	});

	it('should parse combination of simple string and nested relation filter', () => {
		const string = 'boxId: box-001, hseP3kItem.is.type: CONSUMABLE';

		expect(pipe.transform(string)).toEqual({
			boxId: 'box-001',
			hseP3kItem: {
				is: {
					type: 'CONSUMABLE',
				},
			},
		});
	});

	it('should parse multi-nested object correctly', () => {
		const string = 'hseAparRevision.unit.location.city: string(Jakarta), hseAparRevision.unit.location.country: string(ID), hseAparRevision.version: int(2)';

		expect(pipe.transform(string)).toEqual({
			hseAparRevision: {
				version: 2,
				unit: {
					location: {
						city: 'Jakarta',
						country: 'ID',
					},
				},
			},
		});
	});

	it('should parse multi-object with different roots', () => {
		const string = 'hseAparRevision.version: int(2), schedule.every: boolean(true), unit.name: string(Unit A), unit.location: string(Jakarta)';

		expect(pipe.transform(string)).toEqual({
			hseAparRevision: {
				version: 2,
			},
			schedule: {
				every: true,
			},
			unit: {
				name: 'Unit A',
				location: 'Jakarta',
			},
		});
	});

	it('should parse combination of simple and deeply nested values', () => {
		const string = 'id: int(5), hseAparRevision.unit.location.city: string(Surabaya), hseAparRevision.masterAparId: string(123-uuid)';

		expect(pipe.transform(string)).toEqual({
			id: 5,
			hseAparRevision: {
				masterAparId: '123-uuid',
				unit: {
					location: {
						city: 'Surabaya',
					},
				},
			},
		});
	});


	it('should be defined', () => {
		expect(pipe).toBeDefined();
	});
});
